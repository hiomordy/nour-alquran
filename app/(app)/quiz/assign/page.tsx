'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { SURAHS } from '@/lib/quran-data'
import {
  ArrowLeft, Check, ChevronDown, BookOpen, Plus, Trash2, Loader2,
  AlertCircle, ListChecks, X,
} from 'lucide-react'

interface Student {
  id: string
  name: string
  level: number
  xp: number
}

interface ManualQuestion {
  id: string
  question_text: string
  correct_answer: string
  options: string[]
  ayah_reference: string
}

function makeId() {
  return Math.random().toString(36).slice(2, 11)
}

export default function AssignQuizPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const [questions, setQuestions] = useState<ManualQuestion[]>([
    { id: makeId(), question_text: '', correct_answer: '', options: ['', '', '', ''], ayah_reference: '' },
  ])

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

  function addQuestion() {
    setQuestions([...questions, { id: makeId(), question_text: '', correct_answer: '', options: ['', '', '', ''], ayah_reference: '' }])
  }

  function removeQuestion(id: string) {
    if (questions.length <= 1) return
    setQuestions(questions.filter(q => q.id !== id))
  }

  function updateQuestion(id: string, field: keyof ManualQuestion, value: string) {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q))
  }

  function updateOption(qid: string, idx: number, value: string) {
    setQuestions(questions.map(q => {
      if (q.id !== qid) return q
      const opts = [...q.options]
      opts[idx] = value
      return { ...q, options: opts }
    }))
  }

  function addOption(qid: string) {
    setQuestions(questions.map(q => q.id === qid ? { ...q, options: [...q.options, ''] } : q))
  }

  function removeOption(qid: string, idx: number) {
    setQuestions(questions.map(q => {
      if (q.id !== qid) return q
      if (q.options.length <= 2) return q
      const opts = q.options.filter((_, i) => i !== idx)
      let correct = q.correct_answer
      if (correct === q.options[idx]) correct = ''
      return { ...q, options: opts, correct_answer: correct }
    }))
  }

  function validateQuestions(): boolean {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question_text.trim()) {
        setError(`السؤال ${i + 1}: نص السؤال فارغ`)
        return false
      }
      const filled = q.options.filter(o => o.trim())
      if (filled.length < 2) {
        setError(`السؤال ${i + 1}: أضف خيارين على الأقل`)
        return false
      }
      if (!q.correct_answer.trim()) {
        setError(`السؤال ${i + 1}: حدد الإجابة الصحيحة`)
        return false
      }
      if (!filled.includes(q.correct_answer.trim())) {
        setError(`السؤال ${i + 1}: الإجابة الصحيحة يجب أن تكون أحد الخيارات`)
        return false
      }
    }
    return true
  }

  async function handleAssign() {
    if (!selectedStudent || !selectedSurah) return
    if (!validateQuestions()) return

    const surah = SURAHS.find(s => s.number === selectedSurah)
    if (!surah) return

    setLoading(true)
    setError(null)

    try {
      const { data: quizRecord, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          teacher_id: profile!.id,
          student_id: selectedStudent,
          surah_number: selectedSurah,
          surah_name: surah.name,
          difficulty: 'medium',
          status: 'pending',
          total_questions: questions.length,
        })
        .select()
        .single()

      if (quizError) throw quizError

      const questionsToInsert = questions.map((q, i) => ({
        quiz_id: quizRecord.id,
        question_type: 'missing_word',
        question_text: q.question_text.trim(),
        correct_answer: q.correct_answer.trim(),
        options: q.options.filter(o => o.trim()),
        ayah_reference: q.ayah_reference.trim() || null,
        order: i + 1,
      }))

      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .insert(questionsToInsert)

      if (questionsError) throw questionsError

      await supabase.from('notifications').insert({
        user_id: selectedStudent,
        title: 'اختبار جديد',
        body: `تم تكليفك باختبار سورة ${surah.name} — ${questions.length} أسئلة`,
        type: 'quiz',
        read: false,
      })

      router.push('/quiz')
    } catch (err) {
      console.error('Error assigning quiz:', err)
      setError('حدث خطأ أثناء إنشاء الاختبار. حاول مرة أخرى.')
      setLoading(false)
    }
  }

  if (studentsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/quiz')} className="p-2 rounded-lg hover:bg-muted transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">إنشاء اختبار جديد</h1>
          <p className="text-muted-foreground text-sm mt-1">اختر الطالب والسورة ثم اكتب الأسئلة يدوياً</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-4">
        {[
          { num: 1, label: 'الطالب' },
          { num: 2, label: 'السورة' },
          { num: 3, label: 'الأسئلة' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
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

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

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
                  onClick={() => { setSelectedStudent(student.id); setStep(2) }}
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
            <button onClick={() => setStep(1)} className="text-sm text-muted-foreground hover:text-foreground transition">
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
                onClick={() => { setSelectedSurah(surah.number); setStep(3) }}
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

      {/* Step 3: Manual Questions */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-primary" />
              اكتب الأسئلة
            </h2>
            <button onClick={() => setStep(2)} className="text-sm text-muted-foreground hover:text-foreground transition">
              تغيير السورة
            </button>
          </div>

          {/* Summary */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">الطالب:</span>
              <span className="font-semibold text-foreground">{students.find(s => s.id === selectedStudent)?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">السورة:</span>
              <span className="font-semibold text-foreground">{SURAHS.find(s => s.number === selectedSurah)?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">عدد الأسئلة:</span>
              <span className="font-semibold text-foreground">{questions.length}</span>
            </div>
          </div>

          {/* Questions */}
          {questions.map((q, qi) => (
            <div key={q.id} className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">السؤال {qi + 1}</span>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(q.id)} className="text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Question text */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">نص السؤال</label>
                <textarea
                  value={q.question_text}
                  onChange={e => updateQuestion(q.id, 'question_text', e.target.value)}
                  placeholder="مثال: ما الكلمة الناقصة في الآية: الْحَمْدُ لِلَّهِ رَبِّ ______"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm resize-none"
                />
              </div>

              {/* Ayah reference */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">رقم الآية (اختياري)</label>
                <input
                  type="text"
                  value={q.ayah_reference}
                  onChange={e => updateQuestion(q.id, 'ayah_reference', e.target.value)}
                  placeholder="مثال: 2"
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm"
                />
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">الخيارات — اضغط على الخيار الصحيح لتحديده</label>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuestion(q.id, 'correct_answer', opt)}
                        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition ${
                          q.correct_answer === opt && opt.trim()
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-border hover:border-green-400'
                        }`}
                      >
                        {q.correct_answer === opt && opt.trim() && <Check className="w-4 h-4" />}
                      </button>
                      <input
                        type="text"
                        value={opt}
                        onChange={e => updateOption(q.id, oi, e.target.value)}
                        placeholder={`الخيار ${oi + 1}`}
                        className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm"
                      />
                      {q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(q.id, oi)}
                          className="text-red-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {q.options.length < 6 && (
                  <button
                    type="button"
                    onClick={() => addOption(q.id)}
                    className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition"
                  >
                    <Plus className="w-4 h-4" /> إضافة خيار
                  </button>
                )}
                {q.correct_answer && (
                  <p className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> الإجابة الصحيحة: {q.correct_answer}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Add question button */}
          <button
            onClick={addQuestion}
            className="w-full py-3 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <Plus className="w-5 h-5" /> إضافة سؤال آخر
          </button>

          {/* Submit */}
          <button
            onClick={handleAssign}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري إنشاء الاختبار...
              </>
            ) : (
              <>
                <BookOpen className="w-5 h-5" />
                تعيين الاختبار ({questions.length} أسئلة)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
