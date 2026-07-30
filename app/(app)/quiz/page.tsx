'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, Plus, Clock, CheckCircle, AlertCircle, Filter } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/date'

interface Quiz {
  id: string
  teacher_id: string
  student_id: string
  surah_number: number
  surah_name: string
  difficulty: 'easy' | 'medium' | 'hard'
  status: 'pending' | 'completed' | 'expired'
  score: number | null
  total_questions: number
  created_at: string
  completed_at: string | null
  student_name?: string
  teacher_name?: string
}

const DIFFICULTY_LABELS = {
  easy: { label: 'سهل', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
  medium: { label: 'متوسط', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
  hard: { label: 'صعب', color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' },
}

const STATUS_LABELS = {
  pending: { label: 'قيد الانتظار', icon: Clock, color: 'text-amber-600' },
  completed: { label: 'مكتمل', icon: CheckCircle, color: 'text-emerald-600' },
  expired: { label: 'منتهي', icon: AlertCircle, color: 'text-gray-500' },
}

export default function QuizListPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) loadQuizzes()
  }, [profile])

  async function loadQuizzes() {
    if (!profile) return
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading quizzes:', error)
        setError('حدث خطأ في تحميل الاختبارات')
        setLoading(false)
        return
      }

      let quizzesData = (data || []) as Quiz[]

      // Filter by role
      if (profile.role === 'teacher') {
        quizzesData = quizzesData.filter(q => q.teacher_id === profile.id)
      } else {
        quizzesData = quizzesData.filter(q => q.student_id === profile.id)
      }

      // Fetch student names for teachers
      if (profile.role === 'teacher' && quizzesData.length > 0) {
        const studentIds = Array.from(new Set(quizzesData.map(q => q.student_id)))
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', studentIds)

        const nameMap: Record<string, string> = {}
        profilesData?.forEach((p: any) => {
          nameMap[p.id] = p.name
        })

        quizzesData = quizzesData.map(q => ({
          ...q,
          student_name: nameMap[q.student_id],
        }))
      }

      setQuizzes(quizzesData)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all'
    ? quizzes
    : quizzes.filter(q => q.status === filter)

  const isTeacher = profile?.role === 'teacher'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الاختبارات</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isTeacher ? 'تعيين اختبارات ومراقبة نتائج طلابك' : 'اختباراتك المنتظرة والمكتملة'}
          </p>
        </div>
        {isTeacher && (
          <button
            onClick={() => router.push('/quiz/assign')}
            className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            تعيين اختبار
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {(['all', 'pending', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'all' ? 'الكل' : f === 'pending' ? 'قيد الانتظار' : 'مكتمل'}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Quiz List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">لا توجد اختبارات</h3>
          <p className="text-muted-foreground text-sm">
            {isTeacher ? 'ابدأ بتعيين اختبار جديد لطلابك' : 'ليس لديك اختبارات حالياً'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((quiz) => {
            const status = STATUS_LABELS[quiz.status]
            const StatusIcon = status.icon
            const diff = DIFFICULTY_LABELS[quiz.difficulty]

            return (
              <div
                key={quiz.id}
                onClick={() => {
                  if (quiz.status === 'pending' && !isTeacher) {
                    router.push(`/quiz/${quiz.id}`)
                  } else if (quiz.status === 'completed') {
                    router.push(`/quiz/${quiz.id}`)
                  }
                }}
                className={`bg-card border border-border rounded-2xl p-5 transition ${
                  quiz.status === 'pending' && !isTeacher
                    ? 'cursor-pointer hover:border-primary/50 hover:shadow-sm'
                    : quiz.status === 'completed'
                    ? 'cursor-pointer hover:border-primary/50 hover:shadow-sm'
                    : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-6 h-6 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">سورة {quiz.surah_name}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${diff.color}`}>
                        {diff.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <StatusIcon className={`w-3.5 h-3.5 ${status.color}`} />
                        {status.label}
                      </span>
                      {isTeacher && quiz.student_name && (
                        <span>الطالب: {quiz.student_name}</span>
                      )}
                      <span>{quiz.total_questions} سؤال</span>
                      <span>{formatDistanceToNow(quiz.created_at)}</span>
                    </div>
                  </div>

                  {quiz.status === 'completed' && quiz.score !== null && (
                    <div className="text-center shrink-0">
                      <div className={`text-2xl font-bold ${
                        quiz.score >= 80 ? 'text-emerald-600' :
                        quiz.score >= 60 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {quiz.score}%
                      </div>
                      <div className="text-xs text-muted-foreground">النتيجة</div>
                    </div>
                  )}

                  {quiz.status === 'pending' && !isTeacher && (
                    <div className="shrink-0">
                      <span className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl">
                        ابدأ
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
