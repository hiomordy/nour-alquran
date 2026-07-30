'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Video, Plus, Copy, Check, Clock, Users, Radio, ArrowLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from '@/lib/date'
import { cn } from '@/lib/utils'

interface LiveSession {
  id: string
  teacher_id: string
  title: string
  description: string | null
  room_code: string
  status: 'scheduled' | 'live' | 'ended'
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  teacher_name?: string
  participant_count?: number
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default function LivePage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const isTeacher = profile?.role === 'teacher'

  const loadSessions = useCallback(async () => {
    if (!profile) return
    let query = supabase.from('live_sessions').select('*')
    if (isTeacher) {
      query = query.eq('teacher_id', profile.id)
    } else {
      query = query.eq('teacher_id', profile.teacher_id ?? '')
    }
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' })
      return
    }
    const enriched = await Promise.all((data || []).map(async (s) => {
      const { count } = await supabase
        .from('live_participants')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', s.id)
        .is('left_at', null)
      const { data: teacher } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', s.teacher_id)
        .maybeSingle()
      return { ...s, teacher_name: teacher?.name, participant_count: count || 0 }
    }))
    setSessions(enriched)
    setLoading(false)
  }, [profile, isTeacher, toast])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Realtime: listen for new sessions and status changes
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel('live_sessions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, () => {
        loadSessions()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile, loadSessions])

  async function handleCreate() {
    if (!profile || !newTitle.trim()) return
    setCreating(true)
    const code = generateRoomCode()
    const { data, error } = await supabase.from('live_sessions').insert({
      teacher_id: profile.id,
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      room_code: code,
      status: 'scheduled',
    }).select().single()
    setCreating(false)
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' })
      return
    }
    setNewTitle('')
    setNewDesc('')
    setCreateOpen(false)
    toast({ title: 'تم إنشاء الجلسة', description: `رمز الغرفة: ${code}` })
    loadSessions()
  }

  async function handleStartSession(id: string) {
    const { error } = await supabase.from('live_sessions').update({
      status: 'live',
      started_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' })
      return
    }
    window.location.href = `/live/${id}`
  }

  async function handleEndSession(id: string) {
    const { error } = await supabase.from('live_sessions').update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' })
      return
    }
    loadSessions()
  }

  async function handleDeleteSession(id: string) {
    const { error } = await supabase.from('live_sessions').delete().eq('id', id)
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' })
      return
    }
    loadSessions()
  }

  async function handleJoinByCode() {
    if (!joinCode.trim()) return
    const { data, error } = await supabase
      .from('live_sessions')
      .select('id, status')
      .eq('room_code', joinCode.trim().toUpperCase())
      .maybeSingle()
    if (error || !data) {
      toast({ title: 'لم يتم العثور على غرفة', description: 'تأكد من صحة الرمز', variant: 'destructive' })
      return
    }
    if (data.status === 'ended') {
      toast({ title: 'انتهت الجلسة', description: 'هذه الجلسة منتهية بالفعل', variant: 'destructive' })
      return
    }
    setJoinOpen(false)
    setJoinCode('')
    window.location.href = `/live/${data.id}`
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const statusConfig = {
    live: { label: 'مباشر الآن', icon: Radio, color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400', dot: 'bg-red-500' },
    scheduled: { label: 'مجدولة', icon: Clock, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400', dot: 'bg-blue-500' },
    ended: { label: 'منتهية', icon: Clock, color: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            الفصول المباشرة
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isTeacher ? 'أنشئ جلسة مباشرة وادعُ طلابك للحضور' : 'انضم لجلسة التحفيظ المباشرة مع معلمك'}
          </p>
        </div>
        <div className="flex gap-2">
          {!isTeacher && (
            <Button variant="outline" onClick={() => setJoinOpen(true)}>
              <ArrowLeft className="w-4 h-4 ml-2" />
              دخول برمز
            </Button>
          )}
          {isTeacher && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 ml-2" />
              جلسة جديدة
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-foreground mb-1">لا توجد جلسات مباشرة</h3>
          <p className="text-muted-foreground text-sm">
            {isTeacher ? 'أنشئ جلسة جديدة لبدء بث مباشر مع طلابك' : 'لا توجد جلسات مباشرة حالياً'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {sessions.map((session) => {
            const Status = statusConfig[session.status]
            const StatusIcon = Status.icon
            return (
              <div
                key={session.id}
                className={cn(
                  "bg-card border rounded-2xl p-5 transition-all",
                  session.status === 'live' ? "border-red-200 dark:border-red-900 shadow-lg" : "border-border"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate">{session.title}</h3>
                    {session.description && (
                      <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{session.description}</p>
                    )}
                  </div>
                  <Badge className={cn("shrink-0 mr-2", Status.color)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full ml-1", Status.dot, session.status === 'live' && "animate-pulse")} />
                    {Status.label}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {session.participant_count} مشارك
                  </div>
                  {!isTeacher && session.teacher_name && (
                    <div className="flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" />
                      {session.teacher_name}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDistanceToNow(session.created_at)}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 bg-muted rounded-lg px-3 py-2 font-mono text-sm font-bold text-center tracking-widest text-foreground">
                    {session.room_code}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyCode(session.room_code, session.id)}
                  >
                    {copiedId === session.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="flex gap-2">
                  {session.status === 'live' && (
                    <Link href={`/live/${session.id}`} className="flex-1">
                      <Button className="w-full bg-red-600 hover:bg-red-700">
                        <Radio className="w-4 h-4 ml-2" />
                        الانضمام للبث
                      </Button>
                    </Link>
                  )}
                  {session.status === 'scheduled' && isTeacher && (
                    <Button
                      className="flex-1"
                      onClick={() => handleStartSession(session.id)}
                    >
                      <Radio className="w-4 h-4 ml-2" />
                      بدء البث
                    </Button>
                  )}
                  {session.status === 'scheduled' && !isTeacher && (
                    <Button variant="outline" disabled className="flex-1">
                      <Clock className="w-4 h-4 ml-2" />
                      لم تبدأ بعد
                    </Button>
                  )}
                  {session.status === 'ended' && (
                    <Button variant="outline" disabled className="flex-1">
                      انتهت الجلسة
                    </Button>
                  )}
                  {isTeacher && (
                    <>
                      {session.status === 'live' && (
                        <Button
                          variant="outline"
                          onClick={() => handleEndSession(session.id)}
                        >
                          إنهاء
                        </Button>
                      )}
                      {session.status !== 'live' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSession(session.id)}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create session dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء جلسة مباشرة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">عنوان الجلسة</Label>
              <Input
                id="title"
                placeholder="مثال: درس تجويد - سورة البقرة"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">وصف الجلسة (اختياري)</Label>
              <Textarea
                id="desc"
                placeholder="وصف مختصر لموضوع الجلسة"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">إلغاء</Button>
            </DialogClose>
            <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
              {creating ? 'جارٍ الإنشاء...' : 'إنشاء الجلسة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join by code dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>الدخول برمز الغرفة</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="joincode">رمز الغرفة (6 أحرف)</Label>
            <Input
              id="joincode"
              placeholder="ABC123"
              className="text-center font-mono text-lg tracking-widest uppercase"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">إلغاء</Button>
            </DialogClose>
            <Button onClick={handleJoinByCode} disabled={!joinCode.trim()}>
              دخول
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
