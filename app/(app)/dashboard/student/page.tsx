'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getLevelInfo, getLevelTitle } from '@/lib/supabase'
import { Star, Coins, ClipboardList, Trophy, BookOpen, Gamepad2, Building2, Flame, ChevronLeft } from 'lucide-react'

type Assignment = {
  id: string
  surah_name: string
  ayah_from: number
  ayah_to: number
  repeats: number
  due_date: string
  status: string
  repeats_done: number
}

export default function StudentDashboard() {
  const { profile } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [achievementCount, setAchievementCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) loadData()
  }, [profile])

  async function loadData() {
    if (!profile) return
    const [assignRes, achRes] = await Promise.all([
      supabase.from('student_assignments')
        .select('id,surah_name,ayah_from,ayah_to,repeats,due_date,status,repeats_done')
        .eq('student_id', profile.id)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true })
        .limit(4),
      supabase.from('achievements').select('id', { count: 'exact' }).eq('student_id', profile.id).eq('earned', true),
    ])
    setAssignments(assignRes.data || [])
    setAchievementCount(achRes.count || 0)
    setLoading(false)
  }

  if (!profile || loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const levelInfo = getLevelInfo(profile.xp)
  const levelTitle = getLevelTitle(profile.level)

  const quickLinks = [
    { href: '/quran', label: 'القرآن', icon: BookOpen, color: 'bg-emerald-500' },
    { href: '/games', label: 'الألعاب', icon: Gamepad2, color: 'bg-violet-500' },
    { href: '/world', label: 'مدينتي', icon: Building2, color: 'bg-blue-500' },
    { href: '/achievements', label: 'إنجازاتي', icon: Trophy, color: 'bg-amber-500' },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Hero card */}
      <div className="hero-gradient islamic-pattern rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-white/75 text-sm">مرحباً،</p>
              <h1 className="text-xl font-bold">{profile.name}</h1>
              <div className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 text-xs font-medium mt-2">
                <Star className="w-3 h-3 text-amber-300" />
                {levelTitle} — المستوى {profile.level}
              </div>
            </div>
            {profile.streak_days > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-500/80 rounded-xl px-3 py-2 text-sm font-bold">
                <Flame className="w-4 h-4" />
                {profile.streak_days} يوم
              </div>
            )}
          </div>
          <div>
            <div className="flex justify-between text-xs text-white/75 mb-1.5">
              <span>{levelInfo.currentXp} XP</span>
              <span>المستوى {profile.level + 1}: {levelInfo.nextLevelXp} XP</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700 xp-bar"
                style={{ width: `${levelInfo.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center">
            <Coins className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{profile.coins}</div>
            <div className="text-xs text-muted-foreground">عملة</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Star className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{profile.xp}</div>
            <div className="text-xs text-muted-foreground">نقطة XP</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/20 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{assignments.length}</div>
            <div className="text-xs text-muted-foreground">ورد معلق</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{achievementCount}</div>
            <div className="text-xs text-muted-foreground">إنجاز</div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-4 gap-3">
        {quickLinks.map((link) => {
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href} className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-colors card-hover">
              <div className={`w-10 h-10 rounded-xl ${link.color} flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-foreground">{link.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Active assignments */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">أوراد اليوم</h2>
          </div>
          <Link href="/assignments" className="text-sm text-primary hover:underline flex items-center gap-1">
            الكل <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
        {assignments.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardList className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">لا توجد أوراد معلقة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map(a => {
              const progress = a.repeats > 0 ? Math.round((a.repeats_done / a.repeats) * 100) : 0
              return (
                <div key={a.id} className="p-3 rounded-xl bg-muted/40 border border-border/50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-foreground text-sm">{a.surah_name}</div>
                      <div className="text-xs text-muted-foreground">الآيات {a.ayah_from} – {a.ayah_to} • {a.repeats} مرات</div>
                    </div>
                    <div className="text-xs text-muted-foreground">حتى {new Date(a.due_date).toLocaleDateString('ar-SA')}</div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{a.repeats_done} / {a.repeats} مرة</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
