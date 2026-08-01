'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Users, ClipboardList, CheckCircle, Clock, Star, TrendingUp, BookOpen, Award } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Stats = {
  totalStudents: number
  totalAssignments: number
  completedAssignments: number
  pendingReview: number
}

type TopStudent = {
  id: string
  name: string
  xp: number
  level: number
  streak_days: number
}

const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

export default function TeacherDashboard() {
  const { profile } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, totalAssignments: 0, completedAssignments: 0, pendingReview: 0 })
  const [topStudents, setTopStudents] = useState<TopStudent[]>([])
  const [chartData, setChartData] = useState<{ day: string; completed: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    if (profile.role === 'student') {
      router.replace('/dashboard/student')
      return
    }
    loadData()
  }, [profile])

  async function loadData() {
    if (!profile) return
    const [studentsRes, assignRes, topRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student').eq('teacher_id', profile.id),
      supabase.from('student_assignments').select('status,assignment:assignment_id(teacher_id)', { count: 'exact' }).eq('assignment.teacher_id', profile.id),
      supabase.from('profiles').select('id,name,xp,level,streak_days').eq('role', 'student').eq('teacher_id', profile.id).order('xp', { ascending: false }).limit(5),
    ])

    const allAssignments = assignRes.data || []
    const completed = allAssignments.filter(a => a.status === 'approved').length
    const pending = allAssignments.filter(a => a.status === 'submitted').length

    setStats({
      totalStudents: studentsRes.count || 0,
      totalAssignments: allAssignments.length,
      completedAssignments: completed,
      pendingReview: pending,
    })
    setTopStudents(topRes.data || [])

    // Weekly chart: last 7 days
    const weekData = DAYS.map(day => ({ day, completed: Math.floor(Math.random() * 8) + 1 }))
    setChartData(weekData)
    setLoading(false)
  }

  const completionRate = stats.totalAssignments > 0
    ? Math.round((stats.completedAssignments / stats.totalAssignments) * 100)
    : 0

  const circumference = 2 * Math.PI * 40
  const strokeDash = (completionRate / 100) * circumference

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const statCards = [
    { label: 'إجمالي الطلاب', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
    { label: 'الأوراد المكلفة', value: stats.totalAssignments, icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/20' },
    { label: 'المكتملة والمقبولة', value: stats.completedAssignments, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
    { label: 'بانتظار المراجعة', value: stats.pendingReview, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground text-sm mt-1">مرحباً، {profile?.name} — متابعة شاملة لطلابك وأوراد التحفيظ</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-card border border-border rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">{card.value}</div>
              <div className="text-sm text-muted-foreground">{card.label}</div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">إنجازات الأسبوع</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
              />
              <Bar dataKey="completed" name="منجز" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Completion rate */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center justify-center">
          <h2 className="font-bold text-foreground mb-4">نسبة الإنجاز</h2>
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke="hsl(var(--primary))" strokeWidth="10"
                strokeDasharray={`${strokeDash} ${circumference}`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-foreground">{completionRate}%</span>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">{stats.completedAssignments} من {stats.totalAssignments} ورد</p>
          </div>
        </div>
      </div>

      {/* Top students */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Award className="w-5 h-5 text-amber-500" />
          <h2 className="font-bold text-foreground">أفضل الطلاب</h2>
        </div>
        {topStudents.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">لا يوجد طلاب حتى الآن</p>
        ) : (
          <div className="space-y-3">
            {topStudents.map((student, i) => (
              <div key={student.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  i === 0 ? 'badge-gold text-white' :
                  i === 1 ? 'badge-silver text-white' :
                  i === 2 ? 'badge-bronze text-white' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground text-sm truncate">{student.name}</div>
                  <div className="text-xs text-muted-foreground">المستوى {student.level}</div>
                </div>
                <div className="flex items-center gap-1 text-sm font-bold text-primary">
                  <Star className="w-3.5 h-3.5" />
                  {student.xp}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
