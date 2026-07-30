'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { SURAHS } from '@/lib/quran-data'
import { ArrowLeft, Check, ChevronDown, Sparkles, BookOpen, Zap, Target } from 'lucide-react'

interface Student {
  id: string
  name: string
  level: number
  xp: number
}

const DIFFICULTY_OPTIONS = [
  {
    value: 'easy' as const,
    label: 'سهل',
    desc: '3-4 أسئلة: اسم السورة + كلمات ناقصة',
    icon: Zap,
    color: 'emerald',
  },
  {
    value: 'medium' as const,
    label: 'متوسط',
    desc: '5-6 أسئلة: + الآية التالية',
    icon: Target,
    color: 'amber',
  },
  {
    value: 'hard' as const,
    label: 'صعب',
    desc: '7-8 أسئلة: + ترتيب الآيات',
    icon: Sparkles,
    color: 'red',
  },
]

export default function AssignQuizPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [step, setStep] = useState(1)

  useEffect(() => {
    if (profile?.role === 'student') {
      router.replace('/quiz')
      return
    }
    loadStudents()
  }, [profile])

  async function loadStudents() {
    if (!profile) return
    setStudentsLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, name, level, xp')
      .eq('role', 'student')
      .eq('teacher_id', profile.id)
      .order('name', { ascending: true })
    setStudents(data || [])
    setStudentsLoading(false)
  }

  const filteredSurahs = searchQuery.trim()
    ? SURAHS.filter(s => s.name.includes(searchQuery) || String(s.number).includes(searchQuery))
    : SURAHS

  async function handleAssign() {
    if (!selectedStudent || !selectedSurah || !selectedDifficulty) return
    setLoading(true)

    const surah = SURAHS.find(s => s.number === selectedSurah)
    if (!surah) return

    try {
      // Call edge function to generate questions
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-quiz`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            surah_number: selectedSurah,
            difficulty: selectedDifficulty,
          }),
        }
      )

      if (!res.ok) {
        throw new Error('Failed to generate quiz')
      }

      const quizData = await res.json()

      // Create quiz record
      const { data: quizRecord, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          teacher_id: profile!.id,
          student_id: selectedStudent,
          surah_number: selectedSurah,
          surah_name: surah.name,
          difficulty: selectedDifficulty,
          status: 'pending',
          total_questions: quizData.questions.length,
        })
        .select()
        .single()

      if (quizError) throw quizError

      // Insert questions
      const questionsToInsert = quizData.questions.map((q: any) => ({
        quiz_id: quizRecord.id,
        question_type: q.question_type,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        options: q.options,
        ayah_reference: q.ayah_reference,
        order: q.order,
      }))

      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .insert(questionsToInsert)

      if (questionsError) throw questionsError

      router.push('/quiz')
    } catch (error) {
      console.error('Error assigning quiz:', error)
      alert('حدث خطأ أثناء إنشاء الاختبار. حاول مرة أخرى.')
      setLoading(false)
    }
  }

  if (studentsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/quiz')}
          className="p-2 rounded-lg hover:bg-muted transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">تعيين اختبار جديد</h1>
          <p className="text-muted-foreground text-sm mt-1">اختر الطالب والسورة ومستوى الصعوبة</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-4">
        {[
          { num: 1, label: 'الطالب' },
          { num: 2, label: 'السورة' },
          { num: 3, label: 'الصعوبة' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= s.num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {step > s.num ? <Check className="w-4 h-4" /> : s.num}
            </div>
            <span className={`text-sm font-medium ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
            {i < 2 && <div className="w-8 h-0.5 bg-border rounded-full mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Student */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">اختر الطالب</h2>
          {students.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <p className="text-muted-foreground">لا يوجد طلاب مرتبطون بك حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => {
                    setSelectedStudent(student.id)
                    setStep(2)
                  }}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition text-right ${
                    selectedStudent === student.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg">
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-right">
                    <div className="font-semibold text-foreground">{student.name}</div>
                    <div className="text-sm text-muted-foreground">المستوى {student.level} — {student.xp} XP</div>
                  </div>
                  {selectedStudent === student.id && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Surah */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">اختر السورة</h2>
            <button
              onClick={() => setStep(1)}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              تغيير الطالب
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث عن سورة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:border-primary transition"
            />
            <ChevronDown className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto p-1">
            {filteredSurahs.map((surah) => (
              <button
                key={surah.number}
                onClick={() => {
                  setSelectedSurah(surah.number)
                  setStep(3)
                }}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition text-right ${
                  selectedSurah === surah.number
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                  {surah.number}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-foreground truncate">{surah.name}</div>
                  <div className="text-xs text-muted-foreground">{surah.ayahs} آية</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Difficulty */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">اختر مستوى الصعوبة</h2>
            <button
              onClick={() => setStep(2)}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              تغيير السورة
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DIFFICULTY_OPTIONS.map((diff) => {
              const Icon = diff.icon
              const isSelected = selectedDifficulty === diff.value
              return (
                <button
                  key={diff.value}
                  onClick={() => setSelectedDifficulty(diff.value)}
                  className={`relative flex flex-col items-center p-6 rounded-2xl border-2 transition text-center ${
                    isSelected
                      ? `border-${diff.color}-500 bg-${diff.color}-50 dark:bg-${diff.color}-950/20`
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 ${
                    isSelected ? `bg-${diff.color}-500` : 'bg-muted'
                  }`}>
                    <Icon className={`w-7 h-7 ${isSelected ? 'text-white' : 'text-muted-foreground'}`} />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">{diff.label}</h3>
                  <p className="text-sm text-muted-foreground">{diff.desc}</p>
                  {isSelected && (
                    <div className={`absolute top-3 right-3 w-6 h-6 rounded-full bg-${diff.color}-500 flex items-center justify-center`}>
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected summary */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-foreground">ملخص الاختبار</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">الطالب:</span>
                <span className="font-semibold text-foreground">
                  {students.find(s => s.id === selectedStudent)?.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">السورة:</span>
                <span className="font-semibold text-foreground">
                  {SURAHS.find(s => s.number === selectedSurah)?.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">الصعوبة:</span>
                <span className="font-semibold text-foreground">
                  {DIFFICULTY_OPTIONS.find(d => d.value === selectedDifficulty)?.label}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleAssign}
            disabled={!selectedDifficulty || loading}
            className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري إنشاء الاختبار...
              </>
            ) : (
              <>
                <BookOpen className="w-5 h-5" />
                تعيين الاختبار
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
