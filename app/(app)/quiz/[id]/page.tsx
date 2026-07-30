'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Check, ChevronRight, Trophy, RotateCcw, XCircle, CheckCircle2 } from 'lucide-react'

interface Question {
  id: string
  question_type: string
  question_text: string
  correct_answer: string
  options: string[]
  ayah_reference: string
  order: number
}

interface Quiz {
  id: string
  surah_name: string
  surah_number: number
  difficulty: string
  status: string
  total_questions: number
  student_id: string
  score: number | null
  completed_at: string | null
}

interface QuizAnswer {
  question_id: string
  answer: string
  is_correct: boolean
}

export default function QuizPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const params = useParams()
  const quizId = params.id as string

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [score, setScore] = useState(0)

  useEffect(() => {
    if (profile) loadQuiz()
  }, [profile, quizId])

  async function loadQuiz() {
    setLoading(true)

    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single()

    if (quizError || !quizData) {
      router.push('/quiz')
      return
    }

    if (quizData.student_id !== profile?.id && quizData.teacher_id !== profile?.id) {
      router.push('/quiz')
      return
    }

    setQuiz(quizData)

    const { data: questionsData } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order', { ascending: true })

    setQuestions(questionsData || [])

    if (quizData.status === 'completed') {
      setSubmitted(true)
      setScore(quizData.score || 0)

      const { data: answersData } = await supabase
        .from('quiz_answers')
        .select('*')
        .eq('quiz_id', quizId)

      if (answersData) {
        setQuizAnswers(answersData)
        const answerMap: Record<string, string> = {}
        answersData.forEach((a: any) => {
          answerMap[a.question_id] = a.answer
        })
        setAnswers(answerMap)
      }
    }

    setLoading(false)
  }

  async function handleSubmit() {
    if (submitting || !quiz) return
    setSubmitting(true)

    let correctCount = 0
    const answerRecords = []

    for (const q of questions) {
      const userAnswer = answers[q.id] || ''
      const isCorrect = userAnswer === q.correct_answer
      if (isCorrect) correctCount++
      answerRecords.push({
        quiz_id: quizId,
        question_id: q.id,
        answer: userAnswer,
        is_correct: isCorrect,
      })
    }

    const total = questions.length
    const finalScore = total > 0 ? Math.round((correctCount / total) * 100) : 0
    setScore(finalScore)

    await supabase.from('quiz_answers').insert(answerRecords)
    await supabase
      .from('quizzes')
      .update({
        status: 'completed',
        score: finalScore,
        completed_at: new Date().toISOString(),
      })
      .eq('id', quizId)

    setQuizAnswers(answerRecords)
    setSubmitted(true)
    setSubmitting(false)
  }

  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0
  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === questions.length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Results view for completed quiz
  if (submitted || quiz?.status === 'completed') {
    const correctCount = questions.filter(q => answers[q.id] === q.correct_answer).length

    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/quiz')} className="p-2 rounded-lg hover:bg-muted transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">نتيجة الاختبار</h1>
            <p className="text-muted-foreground text-sm">سورة {quiz?.surah_name}</p>
          </div>
        </div>

        {/* Score card */}
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
            score >= 80 ? 'bg-emerald-100' : score >= 60 ? 'bg-amber-100' : 'bg-red-100'
          }`}>
            <Trophy className={`w-10 h-10 ${
              score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'
            }`} />
          </div>
          <div className={`text-5xl font-bold ${
            score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {score}%
          </div>
          <p className="text-muted-foreground">
            {correctCount} من {questions.length} إجابة صحيحة
          </p>
        </div>

        {/* Questions review */}
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">مراجعة الأسئلة</h2>
          {questions.map((q, idx) => {
            const userAnswer = answers[q.id]
            const isCorrect = userAnswer === q.correct_answer
            return (
              <div key={q.id} className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">
                    سؤال {idx + 1}
                  </span>
                  {isCorrect ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5" /> صحيحة
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-md">
                      <XCircle className="w-3.5 h-3.5" /> خاطئة
                    </span>
                  )}
                </div>
                <p className="text-foreground font-medium text-sm leading-relaxed">{q.question_text}</p>
                <div className="text-sm">
                  <span className="text-muted-foreground">إجابتك: </span>
                  <span className={isCorrect ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {userAnswer || '—'}
                  </span>
                </div>
                {!isCorrect && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">الإجابة الصحيحة: </span>
                    <span className="text-emerald-600 font-semibold">{q.correct_answer}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={() => router.push('/quiz')}
          className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition"
        >
          العودة للاختبارات
        </button>
      </div>
    )
  }

  // Quiz taking view
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/quiz')} className="p-2 rounded-lg hover:bg-muted transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">اختبار سورة {quiz?.surah_name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span>سؤال {currentIndex + 1} من {questions.length}</span>
            <span>{answeredCount} مجاب</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      {currentQuestion && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div>
            <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md mb-3">
              {currentQuestion.question_type === 'missing_word' && 'كلمة ناقصة'}
              {currentQuestion.question_type === 'next_ayah' && 'الآية التالية'}
              {currentQuestion.question_type === 'surah_name' && 'اسم السورة'}
              {currentQuestion.question_type === 'order_ayahs' && 'ترتيب الآيات'}
            </span>
            <h2 className="text-lg font-semibold text-foreground leading-relaxed">
              {currentQuestion.question_text}
            </h2>
          </div>

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = answers[currentQuestion.id] === option
              return (
                <button
                  key={idx}
                  onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.id]: option }))}
                  className={`w-full text-right p-4 rounded-xl border-2 transition ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                    </div>
                    <span className="text-foreground text-sm leading-relaxed font-medium">{option}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="flex-1 py-3 rounded-xl border-2 border-border text-foreground font-semibold hover:bg-muted transition disabled:opacity-50"
        >
          السابق
        </button>

        {currentIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            التالي
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                إنهاء الاختبار
              </>
            )}
          </button>
        )}
      </div>

      {/* Question dots */}
      <div className="flex items-center gap-1.5 justify-center flex-wrap">
        {questions.map((q, idx) => {
          const isAnswered = !!answers[q.id]
          const isCurrent = idx === currentIndex
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2.5 h-2.5 rounded-full transition ${
                isCurrent ? 'bg-primary w-6' : isAnswered ? 'bg-primary/50' : 'bg-muted'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}
