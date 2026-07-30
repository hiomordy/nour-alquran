'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, getLevelTitle, getLevelInfo } from '@/lib/supabase'
import { Trophy, Flame, Coins, Lock, Star, Target, TrendingUp, Medal } from 'lucide-react'

interface Achievement {
  id: string
  title: string
  description: string
  badge_icon: string
  earned: boolean
  earned_at?: string
}

interface GameScore {
  id: string
  game_type: string
  score: number
  correct: number
  wrong: number
  created_at: string
}

interface LeaderboardStudent {
  id: string
  name: string
  xp: number
  level: number
}

export default function AchievementsPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [gameHistory, setGameHistory] = useState<GameScore[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardStudent[]>([])
  const [stats, setStats] = useState({
    totalXp: 0,
    totalCorrect: 0,
    bestScore: 0,
    streakDays: 0,
  })
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!loading && !profile) {
      router.replace('/login')
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (profile) {
      loadData()
    }
  }, [profile])

  async function loadData() {
    if (!profile) return

    try {
      // Load achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('student_id', profile.id)

      if (!achievementsError && achievementsData) {
        setAchievements(achievementsData)
      }

      // Load game history (last 5)
      const { data: gameScoresData, error: gameScoresError } = await supabase
        .from('game_scores')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (!gameScoresError && gameScoresData) {
        setGameHistory(gameScoresData)

        // Calculate stats from game scores
        const totalCorrect = gameScoresData.reduce((sum, g) => sum + g.correct, 0)
        const bestScore = gameScoresData.length > 0 ? Math.max(...gameScoresData.map(g => g.score)) : 0

        setStats(prev => ({
          ...prev,
          totalCorrect,
          bestScore,
        }))
      }

      // Load leaderboard (top 5 by XP in same group)
      if (profile.teacher_id) {
        const { data: leaderboardData, error: leaderboardError } = await supabase
          .from('profiles')
          .select('id,name,xp,level')
          .eq('teacher_id', profile.teacher_id)
          .eq('role', 'student')
          .order('xp', { ascending: false })
          .limit(5)

        if (!leaderboardError && leaderboardData) {
          setLeaderboard(leaderboardData as LeaderboardStudent[])
        }
      }

      // Set stats from profile
      setStats(prev => ({
        ...prev,
        totalXp: profile.xp,
        streakDays: profile.streak_days,
      }))
    } catch (error) {
      console.error('Error loading achievements data:', error)
    } finally {
      setPageLoading(false)
    }
  }

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-emerald-600 font-cairo">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const levelInfo = getLevelInfo(profile.xp)
  const levelTitle = getLevelTitle(profile.level)

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-12">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-emerald-800 font-cairo flex items-center gap-2">
            <Trophy className="w-8 h-8 text-amber-500" />
            الإنجازات والشارات
          </h1>
          <p className="text-emerald-600 font-cairo mt-2">عرض شامل لإنجازاتك وتقدمك الدراسي</p>
        </div>

        {/* Profile Hero Card */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-3xl p-8 text-white shadow-lg">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-4xl font-bold font-cairo mb-2">{profile.name}</h2>
              <p className="text-emerald-100 text-lg font-cairo mb-6">{levelTitle}</p>

              {/* XP Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-cairo">النقاط: {profile.xp}</span>
                  <span className="text-xs font-cairo text-emerald-100">المستوى {profile.level}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-500"
                    style={{ width: `${levelInfo.progress}%` }}
                  />
                </div>
                <p className="text-xs text-emerald-100 mt-1 font-cairo">
                  {levelInfo.currentXp} / {levelInfo.nextLevelXp} نقطة
                </p>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-300" />
                  <div>
                    <p className="text-xs text-emerald-100 font-cairo">الانقطاع</p>
                    <p className="text-xl font-bold font-cairo">{stats.streakDays}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-300" />
                  <div>
                    <p className="text-xs text-emerald-100 font-cairo">العملات</p>
                    <p className="text-xl font-bold font-cairo">{profile.coins}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Level Badge */}
            <div className="flex items-center justify-center">
              <div className="relative w-40 h-40">
                <svg className="w-40 h-40 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="white"
                    strokeWidth="4"
                    strokeDasharray={`${(levelInfo.progress / 100) * 282.7} 282.7`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Star className="w-10 h-10 text-yellow-300 mb-1" />
                  <span className="text-2xl font-bold font-cairo">{profile.level}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-6 border-2 border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold text-foreground font-cairo">{stats.totalXp}</span>
            </div>
            <p className="text-sm text-muted-foreground font-cairo">إجمالي النقاط</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold text-foreground font-cairo">{stats.totalCorrect}</span>
            </div>
            <p className="text-sm text-muted-foreground font-cairo">إجابات صحيحة</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Medal className="w-5 h-5 text-yellow-600" />
              <span className="text-2xl font-bold text-foreground font-cairo">{stats.bestScore}</span>
            </div>
            <p className="text-sm text-muted-foreground font-cairo">أفضل درجة</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Flame className="w-5 h-5 text-orange-600" />
              <span className="text-2xl font-bold text-foreground font-cairo">{stats.streakDays}</span>
            </div>
            <p className="text-sm text-muted-foreground font-cairo">أيام متتالية</p>
          </div>
        </div>

        {/* Badges Grid */}
        <div>
          <h3 className="text-2xl font-bold text-emerald-800 font-cairo mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            الشارات
          </h3>

          {achievements.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-emerald-200">
              <Trophy className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
              <p className="text-emerald-600 font-cairo">لم تحقق أي شارات حتى الآن. استمر في الدراسة!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {achievements.map(achievement => (
                <div
                  key={achievement.id}
                  className={`relative rounded-2xl p-6 transition-all border-2 ${
                    achievement.earned
                      ? 'bg-white border-amber-200 shadow-md'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  {!achievement.earned && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl">
                      <Lock className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  <div className={`text-5xl mb-3 text-center ${!achievement.earned ? 'opacity-50' : ''}`}>
                    {achievement.badge_icon}
                  </div>

                  <h4 className={`font-bold text-center font-cairo mb-1 ${
                    achievement.earned ? 'text-gray-800' : 'text-gray-600'
                  }`}>
                    {achievement.title}
                  </h4>

                  <p className={`text-xs text-center font-cairo line-clamp-2 ${
                    achievement.earned ? 'text-gray-600' : 'text-gray-500'
                  }`}>
                    {achievement.description}
                  </p>

                  {achievement.earned && achievement.earned_at && (
                    <p className="text-xs text-emerald-600 text-center mt-3 font-cairo">
                      {new Date(achievement.earned_at).toLocaleDateString('ar-SA')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mini Leaderboard */}
        {profile.teacher_id && (
          <div>
            <h3 className="text-2xl font-bold text-emerald-800 font-cairo mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500" />
              أفضل الطلاب
            </h3>

            {leaderboard.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border-2 border-emerald-100">
                <p className="text-emerald-600 font-cairo">لا يوجد بيانات حتى الآن</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl overflow-hidden border-2 border-emerald-100 shadow-md">
                <div className="divide-y divide-emerald-100">
                  {leaderboard.map((student, index) => {
                    const isCurrentUser = student.id === profile.id
                    return (
                      <div
                        key={student.id}
                        className={`p-4 flex items-center gap-4 transition-colors ${
                          isCurrentUser
                            ? 'bg-emerald-50 border-l-4 border-emerald-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          index === 0 ? 'bg-yellow-400 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-amber-600 text-white' :
                          'bg-emerald-200 text-emerald-800'
                        }`}>
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold font-cairo truncate ${
                            isCurrentUser ? 'text-emerald-700' : 'text-gray-800'
                          }`}>
                            {student.name} {isCurrentUser && <span className="text-xs text-emerald-600 font-cairo ml-1">(أنت)</span>}
                          </div>
                          <div className="text-xs text-gray-500 font-cairo">
                            المستوى {student.level}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-emerald-600 font-cairo flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            {student.xp}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Game History */}
        <div>
          <h3 className="text-2xl font-bold text-emerald-800 font-cairo mb-6 flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            سجل الألعاب
          </h3>

          {gameHistory.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border-2 border-emerald-100">
              <Target className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
              <p className="text-emerald-600 font-cairo">لم تلعب أي ألعاب بعد</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl overflow-hidden border-2 border-emerald-100 shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-emerald-50 border-b-2 border-emerald-100">
                    <tr>
                      <th className="px-6 py-3 text-right text-sm font-bold text-emerald-800 font-cairo">اللعبة</th>
                      <th className="px-6 py-3 text-right text-sm font-bold text-emerald-800 font-cairo">الدرجة</th>
                      <th className="px-6 py-3 text-right text-sm font-bold text-emerald-800 font-cairo">صحيح / خاطئ</th>
                      <th className="px-6 py-3 text-right text-sm font-bold text-emerald-800 font-cairo">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100">
                    {gameHistory.map(game => (
                      <tr key={game.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-cairo font-semibold">
                            {game.game_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-lg text-emerald-600 font-cairo">{game.score}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-3 font-cairo text-sm">
                            <span className="text-green-600">✓ {game.correct}</span>
                            <span className="text-red-600">✕ {game.wrong}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-cairo">
                          {new Date(game.created_at).toLocaleDateString('ar-SA')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
