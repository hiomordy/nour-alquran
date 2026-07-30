'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { GAME_AYAHS } from '@/lib/quran-data';
import { Trophy, RotateCcw, ArrowRight, Clock } from 'lucide-react';

type FlatAyah = {
  surah: number;
  surahName: string;
  ayahNum: number;
  text: string;
};

// Flatten GAME_AYAHS into individual ayahs
const FLAT_AYAHS: FlatAyah[] = GAME_AYAHS.flatMap(s =>
  s.ayahs.map(a => ({ surah: s.surah, surahName: s.name, ayahNum: a.n, text: a.t }))
)

type GameState = 'idle' | 'playing' | 'finished';

interface CompleteAyahQuestion { type: 'complete-ayah'; ayah: FlatAyah; firstHalf: string; secondHalf: string; options: string[] }
interface GuessSurahQuestion { type: 'guess-surah'; ayah: FlatAyah; options: { name: string; surah: number }[] }
interface OrderAyahsQuestion { type: 'order-ayahs'; ayahs: FlatAyah[]; selected: number[]; correct: number[] }
interface QuickChallengeQuestion { type: 'quick-challenge'; ayah: FlatAyah; firstHalf: string; secondHalf: string; options: string[] }

type Question = CompleteAyahQuestion | GuessSurahQuestion | OrderAyahsQuestion | QuickChallengeQuestion;

const GAME_CONFIG = {
  'complete-ayah': { title: 'أكمل الآية', questions: 10, points: 10 },
  'guess-surah': { title: 'خمّن السورة', questions: 10, points: 10 },
  'order-ayahs': { title: 'رتّب الآيات', questions: 5, points: 5 },
  'quick-challenge': { title: 'التحدي السريع', questions: null as null | number, points: 10 },
};

function buildCompleteAyahQ(ayah: FlatAyah): CompleteAyahQuestion | null {
  const words = ayah.text.split(' ')
  if (words.length < 3) return null
  const split = Math.floor(words.length / 2)
  const firstHalf = words.slice(0, split).join(' ')
  const secondHalf = words.slice(split).join(' ')
  const wrongs = FLAT_AYAHS.filter(a => a.text !== ayah.text)
    .sort(() => Math.random() - 0.5).slice(0, 3)
    .map(a => { const w = a.text.split(' '); return w.slice(Math.floor(w.length / 2)).join(' ') })
  return { type: 'complete-ayah', ayah, firstHalf, secondHalf, options: [secondHalf, ...wrongs].sort(() => Math.random() - 0.5) }
}

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const { user, profile } = useAuth();
  const gameSlug = params.game as string;
  const gameConfig = GAME_CONFIG[gameSlug as keyof typeof GAME_CONFIG];

  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [qIndex, setQIndex] = useState(0)
  const [gameState, setGameState] = useState<GameState>('idle')
  const [startTime, setStartTime] = useState(0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [timeLeft, setTimeLeft] = useState(60)
  const [totalXP, setTotalXP] = useState(0)

  const generateQuestions = useCallback(() => {
    if (gameSlug === 'complete-ayah' || gameSlug === 'quick-challenge') {
      const count = gameSlug === 'quick-challenge' ? 100 : 10
      const qs: Question[] = []
      let attempts = 0
      while (qs.length < count && attempts < 500) {
        attempts++
        const q = buildCompleteAyahQ(rand(FLAT_AYAHS))
        if (q) qs.push({ ...q, type: gameSlug === 'quick-challenge' ? 'quick-challenge' : 'complete-ayah' } as Question)
      }
      setQuestions(qs)
    } else if (gameSlug === 'guess-surah') {
      const qs: GuessSurahQuestion[] = []
      for (let i = 0; i < 10; i++) {
        const ayah = rand(FLAT_AYAHS)
        const wrongs = GAME_AYAHS.filter(s => s.surah !== ayah.surah).sort(() => Math.random() - 0.5).slice(0, 3)
          .map(s => ({ name: s.name, surah: s.surah }))
        const options = [{ name: ayah.surahName, surah: ayah.surah }, ...wrongs].sort(() => Math.random() - 0.5)
        qs.push({ type: 'guess-surah', ayah, options })
      }
      setQuestions(qs)
    } else if (gameSlug === 'order-ayahs') {
      const validSurahs = GAME_AYAHS.filter(s => s.ayahs.length >= 4)
      if (!validSurahs.length) { setQuestions([]); return }
      const qs: OrderAyahsQuestion[] = []
      for (let i = 0; i < 5; i++) {
        const surahData = rand(validSurahs)
        const ayahs: FlatAyah[] = surahData.ayahs.slice(0, 4).map(a => ({ surah: surahData.surah, surahName: surahData.name, ayahNum: a.n, text: a.t }))
        const correct = ayahs.map(a => a.ayahNum)
        const shuffled = [...ayahs].sort(() => Math.random() - 0.5)
        qs.push({ type: 'order-ayahs', ayahs: shuffled, selected: [], correct })
      }
      setQuestions(qs)
    }
  }, [gameSlug])

  useEffect(() => {
    if (!user || !gameConfig) return
    generateQuestions()
    setGameState('playing')
    setStartTime(Date.now())
  }, [user, gameConfig, generateQuestions])

  // Quick challenge timer
  useEffect(() => {
    if (gameState !== 'playing' || gameSlug !== 'quick-challenge') return
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { setGameState('finished'); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [gameState, gameSlug])

  const currentQ = questions[qIndex] ?? null

  const advanceOrFinish = useCallback((idx: number) => {
    const totalQ = gameConfig?.questions ?? questions.length
    if (idx + 1 >= totalQ || gameSlug === 'quick-challenge') {
      setGameState('finished')
    } else {
      setQIndex(idx + 1)
    }
  }, [gameConfig, gameSlug, questions.length])

  const handleAnswer = useCallback((answer: string) => {
    if (!currentQ || selectedAnswer || gameState !== 'playing') return
    if (currentQ.type === 'order-ayahs') return
    setSelectedAnswer(answer)
    const isCorrect = currentQ.type === 'guess-surah'
      ? answer === currentQ.ayah.surahName
      : answer === (currentQ as CompleteAyahQuestion | QuickChallengeQuestion).secondHalf
    setAnswerFeedback(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) { setScore(s => s + gameConfig!.points); setCorrect(c => c + 1); setTotalXP(x => x + gameConfig!.points * 5) }
    else setWrong(w => w + 1)
    const idx = qIndex
    setTimeout(() => {
      setSelectedAnswer(null); setAnswerFeedback(null)
      advanceOrFinish(idx)
    }, 1200)
  }, [currentQ, selectedAnswer, gameState, qIndex, gameConfig, advanceOrFinish])

  const handleOrderSelect = useCallback((ayahIdx: number) => {
    if (!currentQ || currentQ.type !== 'order-ayahs' || gameState !== 'playing') return
    const q = currentQ as OrderAyahsQuestion
    const already = q.selected.indexOf(ayahIdx)
    let newSelected: number[]
    if (already !== -1) {
      newSelected = q.selected.filter((_, i) => i !== already)
    } else {
      newSelected = [...q.selected, ayahIdx]
    }
    const updatedQ: OrderAyahsQuestion = { ...q, selected: newSelected }
    setQuestions(prev => prev.map((item, i) => i === qIndex ? updatedQ : item))

    if (newSelected.length === q.ayahs.length) {
      const orderedNums = newSelected.map(i => q.ayahs[i].ayahNum)
      const isCorrect = orderedNums.every((n, i) => n === q.correct[i])
      setAnswerFeedback(isCorrect ? 'correct' : 'wrong')
      if (isCorrect) { setScore(s => s + gameConfig!.points); setCorrect(c => c + 1); setTotalXP(x => x + gameConfig!.points * 5) }
      else setWrong(w => w + 1)
      const idx = qIndex
      setTimeout(() => { setAnswerFeedback(null); advanceOrFinish(idx) }, 1200)
    }
  }, [currentQ, gameState, qIndex, gameConfig, advanceOrFinish])

  const saveScore = useCallback(async () => {
    if (!user) return
    const duration = Math.floor((Date.now() - startTime) / 1000)
    await supabase.from('game_scores').insert({ user_id: user.id, game_type: gameSlug, score, correct, wrong, duration })
    if (profile) {
      await supabase.from('profiles').update({ xp: (profile.xp || 0) + totalXP, coins: (profile.coins || 0) + 10 }).eq('id', user.id)
    }
  }, [user, profile, gameSlug, score, correct, wrong, startTime, totalXP])

  useEffect(() => { if (gameState === 'finished') saveScore() }, [gameState, saveScore])

  const handlePlayAgain = () => {
    setScore(0); setCorrect(0); setWrong(0); setQIndex(0)
    setGameState('idle'); setSelectedAnswer(null); setAnswerFeedback(null)
    setTimeLeft(60); setTotalXP(0)
    generateQuestions()
    setTimeout(() => { setGameState('playing'); setStartTime(Date.now()) }, 50)
  }

  if (!gameConfig) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">اللعبة غير موجودة</p>
          <button onClick={() => router.push('/games')} className="px-6 py-3 bg-white text-primary font-bold rounded-xl">العودة للألعاب</button>
        </div>
      </div>
    )
  }

  if (gameState === 'idle' || !currentQ) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">جاري تحميل اللعبة...</p>
        </div>
      </div>
    )
  }

  if (gameState === 'finished') {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-lg mx-auto">
          <div className="hero-gradient rounded-2xl p-8 mb-6 text-center text-white">
            <Trophy className="w-14 h-14 mx-auto mb-3" />
            <h1 className="text-3xl font-bold mb-1">أحسنت!</h1>
            <p className="text-white/80">انتهيت من {gameConfig.title}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-800 rounded-xl p-4 text-center border border-primary/30">
              <p className="text-slate-400 text-xs mb-1">النقاط</p>
              <p className="text-2xl font-bold text-primary">{score}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 text-center border border-green-500/30">
              <p className="text-slate-400 text-xs mb-1">صحيحة</p>
              <p className="text-2xl font-bold text-green-400">{correct}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 text-center border border-red-500/30">
              <p className="text-slate-400 text-xs mb-1">خاطئة</p>
              <p className="text-2xl font-bold text-red-400">{wrong}</p>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 mb-5 text-center border-2 border-amber-500/50">
            <p className="text-slate-400 text-sm mb-1">نقاط الخبرة المكتسبة</p>
            <p className="text-4xl font-bold text-amber-400">+{totalXP} XP</p>
            <p className="text-slate-400 text-xs mt-1">+10 عملة ذهبية</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handlePlayAgain} className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors">
              <RotateCcw className="w-4 h-4" /> العب مجدداً
            </button>
            <button onClick={() => router.push('/games')} className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-colors">
              الألعاب <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const progressPct = gameConfig.questions ? ((qIndex + 1) / gameConfig.questions) * 100 : 0

  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="hero-gradient rounded-2xl p-5 mb-5 text-white">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">{gameConfig.title}</h1>
            <div className="flex items-center gap-4">
              {gameSlug === 'quick-challenge' && (
                <div className="flex items-center gap-1.5 bg-white/20 rounded-lg px-3 py-1.5">
                  <Clock className="w-4 h-4" />
                  <span className="font-bold">{timeLeft}s</span>
                </div>
              )}
              <div className="text-white/90 text-sm">{score} نقطة</div>
            </div>
          </div>
          {gameConfig.questions && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>السؤال {qIndex + 1} / {gameConfig.questions}</span>
                <span>{correct} صحيح • {wrong} خطأ</span>
              </div>
              <div className="h-1.5 bg-white/20 rounded-full">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Answer feedback overlay */}
        {answerFeedback && (
          <div className={`mb-4 p-3 rounded-xl text-center text-sm font-bold ${answerFeedback === 'correct' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            {answerFeedback === 'correct' ? 'إجابة صحيحة!' : 'إجابة خاطئة'}
          </div>
        )}

        {/* Complete Ayah / Quick Challenge */}
        {(currentQ.type === 'complete-ayah' || currentQ.type === 'quick-challenge') && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <p className="text-slate-400 text-xs mb-3">أكمل الآية الكريمة:</p>
              <p className="quran-font text-xl text-center text-green-300 leading-loose">
                {currentQ.firstHalf} <span className="text-slate-500">...</span>
              </p>
            </div>
            <div className="space-y-3">
              {currentQ.options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(opt)} disabled={!!selectedAnswer}
                  className={`w-full p-4 rounded-xl text-right quran-font text-base transition-all border ${
                    selectedAnswer === opt
                      ? answerFeedback === 'correct' ? 'bg-green-600 border-green-500 text-white' : 'bg-red-600 border-red-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600'
                  } disabled:cursor-not-allowed`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Guess Surah */}
        {currentQ.type === 'guess-surah' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <p className="text-slate-400 text-xs mb-3">من أي سورة هذه الآية؟</p>
              <p className="quran-font text-xl text-center text-green-300 leading-loose">{currentQ.ayah.text}</p>
            </div>
            <div className="space-y-3">
              {currentQ.options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(opt.name)} disabled={!!selectedAnswer}
                  className={`w-full p-4 rounded-xl text-right text-base font-medium transition-all border ${
                    selectedAnswer === opt.name
                      ? answerFeedback === 'correct' ? 'bg-green-600 border-green-500 text-white' : 'bg-red-600 border-red-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600'
                  } disabled:cursor-not-allowed`}>
                  سورة {opt.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Order Ayahs */}
        {currentQ.type === 'order-ayahs' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <p className="text-slate-400 text-xs mb-1">رتّب آيات سورة {currentQ.ayahs[0]?.surahName} بالترتيب الصحيح</p>
              <p className="text-slate-500 text-xs">اضغط على الآيات بالترتيب</p>
            </div>
            <div className="space-y-3">
              {currentQ.ayahs.map((ayah, i) => {
                const selectedRank = currentQ.selected.indexOf(i)
                return (
                  <button key={i} onClick={() => handleOrderSelect(i)} disabled={!!answerFeedback}
                    className={`w-full p-4 rounded-xl text-right quran-font text-base transition-all border flex items-center gap-3 ${
                      selectedRank !== -1 ? 'bg-primary/80 border-primary text-white' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    }`}>
                    <span className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold shrink-0">
                      {selectedRank !== -1 ? selectedRank + 1 : '?'}
                    </span>
                    {ayah.text}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
