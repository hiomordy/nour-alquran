'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { PenLine, BookOpen, List, Zap, ArrowLeft } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface GameCard {
  id: string;
  title: string;
  description: string;
  slug: string;
  icon: React.ReactNode;
  gradient: string;
  difficulty: string;
  xpReward: string;
}

interface GameScore {
  game_type: string;
  best_score: number;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const games: GameCard[] = [
  {
    id: '1',
    title: 'أكمل الآية',
    description: 'أكمل الجزء الناقص من الآية من خيارات متعددة',
    slug: 'complete-ayah',
    icon: <PenLine className="w-12 h-12 text-white" />,
    gradient: 'from-green-500 to-emerald-600',
    difficulty: 'سهل',
    xpReward: 'حتى 50 XP',
  },
  {
    id: '2',
    title: 'خمّن السورة',
    description: 'هل تعرف أي سورة تنتمي إليها هذه الآية؟',
    slug: 'guess-surah',
    icon: <BookOpen className="w-12 h-12 text-white" />,
    gradient: 'from-blue-500 to-cyan-600',
    difficulty: 'متوسط',
    xpReward: 'حتى 75 XP',
  },
  {
    id: '3',
    title: 'رتّب الآيات',
    description: 'رتب الآيات بالترتيب الصحيح من السورة',
    slug: 'order-ayahs',
    icon: <List className="w-12 h-12 text-white" />,
    gradient: 'from-violet-500 to-purple-600',
    difficulty: 'صعب',
    xpReward: 'حتى 100 XP',
  },
  {
    id: '4',
    title: 'التحدي السريع',
    description: 'تحدي لمدة 60 ثانية - أجب على أسئلة الذاكرة بسرعة',
    slug: 'quick-challenge',
    icon: <Zap className="w-12 h-12 text-white" />,
    gradient: 'from-amber-500 to-orange-600',
    difficulty: 'صعب جداً',
    xpReward: 'حتى 150 XP',
  },
];

export default function GamesPage() {
  const { profile } = useAuth();
  const [gameScores, setGameScores] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGameScores = async () => {
      if (!profile?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('game_scores')
          .select('game_type, score')
          .eq('user_id', profile.id)
          .order('score', { ascending: false });

        if (error) {
          console.error('Error fetching game scores:', error);
          setLoading(false);
          return;
        }

        // Group by game_type and get the best score for each
        const grouped = new Map<string, number>();
        data?.forEach((item) => {
          const current = grouped.get(item.game_type);
          if (!current || item.score > current) {
            grouped.set(item.game_type, item.score);
          }
        });

        const scores: GameScore[] = Array.from(grouped, ([game_type, best_score]) => ({
          game_type,
          best_score,
        })).sort((a, b) => b.best_score - a.best_score);

        setGameScores(scores);
      } catch (error) {
        console.error('Error fetching game scores:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGameScores();
  }, [profile?.id]);

  const getGameTypeLabel = (slug: string): string => {
    const gameMap: Record<string, string> = {
      'complete-ayah': 'أكمل الآية',
      'guess-surah': 'خمّن السورة',
      'order-ayahs': 'رتّب الآيات',
      'quick-challenge': 'التحدي السريع',
    };
    return gameMap[slug] || slug;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8 rtl" dir="rtl">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 font-cairo">
              ألعاب القرآن الكريم
            </h1>
            <p className="text-slate-600 mt-2 font-cairo">
              اختبر ذاكرتك وتعلم القرآن الكريم بطريقة ممتعة وتفاعلية
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {games.map((game) => (
            <Link key={game.id} href={`/games/${game.slug}`}>
              <div className="group h-full bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden cursor-pointer">
                {/* Gradient Header with Icon */}
                <div
                  className={`bg-gradient-to-br ${game.gradient} p-8 flex items-center justify-center h-48 relative overflow-hidden`}
                >
                  {/* Animated background elements */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                  </div>
                  <div className="relative group-hover:scale-110 transition-transform duration-300">
                    {game.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Title */}
                  <h2 className="text-2xl font-bold text-slate-900 mb-3 font-cairo text-right">
                    {game.title}
                  </h2>

                  {/* Description */}
                  <p className="text-slate-600 text-sm mb-4 font-cairo text-right line-clamp-2">
                    {game.description}
                  </p>

                  {/* Difficulty Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full font-cairo">
                      {game.difficulty}
                    </span>
                  </div>

                  {/* XP Reward */}
                  <div className="flex items-center justify-between mb-6 py-2 px-3 bg-green-50 rounded-lg">
                    <span className="text-green-700 font-semibold text-sm font-cairo">
                      {game.xpReward}
                    </span>
                  </div>

                  {/* Play Button */}
                  <button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-cairo group-hover:shadow-lg">
                    العب الآن
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Leaderboard Section */}
        {profile && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 font-cairo text-right">
              إحصائياتي الأفضل
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
              </div>
            ) : gameScores.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {gameScores.map((score) => (
                  <div
                    key={score.game_type}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200"
                  >
                    <p className="text-slate-600 text-sm font-cairo mb-2">
                      {getGameTypeLabel(score.game_type)}
                    </p>
                    <p className="text-3xl font-bold text-green-600 font-cairo">
                      {score.best_score}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-500 font-cairo text-lg">
                  لم تلعب أي لعبة بعد. ابدأ اللعب الآن لترى إحصائياتك!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Decorative Elements */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
        .font-cairo {
          font-family: 'Cairo', sans-serif;
        }
      `}</style>
    </div>
  );
}
