'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Volume2, Play, Pause, Download, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SURAHS, RECITERS, getAudioUrl } from '@/lib/quran-data';

interface Ayah {
  numberInSurah: number;
  text: string;
}

interface Bookmark {
  id: string;
  ayah_number: number;
  created_at: string;
}

interface LoadingSkeletonProps {
  count?: number;
}

const LoadingSkeleton = ({ count = 10 }: LoadingSkeletonProps) => (
  <div className="space-y-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="h-24 bg-amber-200/20 rounded-lg"></div>
      </div>
    ))}
  </div>
);

export default function SurahPage({ params }: { params: { surah: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const surahNumber = parseInt(params.surah, 10);

  const surah = SURAHS.find((s) => s.number === surahNumber);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReciter, setSelectedReciter] = useState(RECITERS[0]?.id || '');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState<'lg' | 'xl' | '2xl'>('xl');
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playAllQueueRef = useRef<number[]>([]);

  // Calculate surah start number (global ayah number for first ayah)
  const calculateSurahStartNumber = (): number => {
    let count = 1;
    for (let i = 0; i < surahNumber - 1; i++) {
      count += SURAHS[i].ayahs;
    }
    return count;
  };

  const surahStartNum = calculateSurahStartNumber();

  // Fetch ayahs
  useEffect(() => {
    const fetchAyahs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`
        );
        if (!response.ok) throw new Error('Failed to fetch ayahs');
        const data = await response.json();
        setAyahs(data.data.ayahs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (surah) {
      fetchAyahs();
    }
  }, [surahNumber, surah]);

  // Load bookmarks
  useEffect(() => {
    const loadBookmarks = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('quran_bookmarks')
          .select('ayah_number')
          .eq('user_id', user.id)
          .eq('surah_number', surahNumber);
        setBookmarks(new Set((data || []).map((b) => b.ayah_number)));
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      }
    };

    loadBookmarks();
  }, [user, surahNumber]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playAyah = (ayahIndex: number) => {
    const globalAyahNum = surahStartNum + ayahIndex;
    const audioUrl = getAudioUrl(selectedReciter, globalAyahNum);

    if (audioRef.current) {
      audioRef.current.pause();
    }

    audioRef.current = new Audio(audioUrl);
    audioRef.current.onended = () => {
      setCurrentlyPlaying(null);
    };
    audioRef.current.onerror = () => {
      console.error('Audio playback failed');
      setCurrentlyPlaying(null);
    };
    audioRef.current.play().catch(() => {
      setCurrentlyPlaying(null);
    });
    setCurrentlyPlaying(ayahIndex);
  };

  const playAllAyahs = async () => {
    if (isPlayingAll) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlayingAll(false);
      setCurrentlyPlaying(null);
      return;
    }

    setIsPlayingAll(true);
    playAllQueueRef.current = Array.from({ length: ayahs.length }, (_, i) => i);

    const playNext = (index: number) => {
      if (index >= playAllQueueRef.current.length) {
        setIsPlayingAll(false);
        setCurrentlyPlaying(null);
        return;
      }

      const ayahIndex = playAllQueueRef.current[index];
      const globalAyahNum = surahStartNum + ayahIndex;
      const audioUrl = getAudioUrl(selectedReciter, globalAyahNum);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      audioRef.current = new Audio(audioUrl);
      setCurrentlyPlaying(ayahIndex);

      audioRef.current.onended = () => {
        playNext(index + 1);
      };
      audioRef.current.onerror = () => {
        playNext(index + 1);
      };
      audioRef.current.play().catch(() => {
        playNext(index + 1);
      });
    };

    playNext(0);
  };

  const toggleBookmark = async (ayahNumber: number) => {
    if (!user) return;

    try {
      const isBookmarked = bookmarks.has(ayahNumber);
      if (isBookmarked) {
        await supabase
          .from('quran_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('surah_number', surahNumber)
          .eq('ayah_number', ayahNumber);
        setBookmarks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(ayahNumber);
          return newSet;
        });
      } else {
        await supabase.from('quran_bookmarks').insert({
          user_id: user.id,
          surah_number: surahNumber,
          ayah_number: ayahNumber,
          created_at: new Date().toISOString(),
        });
        setBookmarks((prev) => new Set(prev).add(ayahNumber));
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  if (!surah) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-500">Surah not found</p>
      </div>
    );
  }

  const prevSurah = surahNumber > 1 ? SURAHS[surahNumber - 2] : null;
  const nextSurah = surahNumber < 114 ? SURAHS[surahNumber] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-b border-amber-200/30 dark:border-amber-900/30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Top Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-amber-700 dark:text-amber-200 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 p-2 rounded-lg transition"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <div className="text-center">
              <h1 className="quran-font text-4xl text-amber-900 dark:text-amber-100">
                {surah.name}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {surah.englishName} - {surah.ayahs} ayahs - {surah.type}
              </p>
            </div>
            <div className="w-20" />
          </div>

          {/* Reciter Selector and Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reciter
              </label>
              <select
                value={selectedReciter}
                onChange={(e) => {
                  setSelectedReciter(e.target.value);
                  if (audioRef.current) {
                    audioRef.current.pause();
                    setCurrentlyPlaying(null);
                    setIsPlayingAll(false);
                  }
                }}
                className="px-3 py-2 border border-amber-200 dark:border-amber-900 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {RECITERS.map((reciter) => (
                  <option key={reciter.id} value={reciter.id}>
                    {reciter.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size Controls */}
            <div className="flex gap-2 items-end">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Font Size:
              </span>
              {(['lg', 'xl', '2xl'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`px-3 py-2 rounded-lg transition ${
                    fontSize === size
                      ? 'bg-amber-600 text-white dark:bg-amber-500'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                  }`}
                >
                  {size === 'lg' ? 'A' : size === 'xl' ? 'A+' : 'A++'}
                </button>
              ))}
            </div>

            {/* Play All Button */}
            <button
              onClick={playAllAyahs}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                isPlayingAll
                  ? 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600'
                  : 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700'
              }`}
            >
              {isPlayingAll ? (
                <>
                  <Pause size={18} />
                  Stop
                </>
              ) : (
                <>
                  <Play size={18} />
                  Play All
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Bismillah */}
        {surahNumber !== 1 && surahNumber !== 9 && (
          <div className={`text-center mb-8 quran-font text-amber-900 dark:text-amber-100 ${
            fontSize === 'lg' ? 'text-2xl' : fontSize === 'xl' ? 'text-3xl' : 'text-4xl'
          }`}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
        )}

        {/* Loading State */}
        {loading && <LoadingSkeleton count={surah.ayahs} />}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-800 dark:text-red-200 px-6 py-4 rounded-lg text-center">
            <p className="font-medium mb-3">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Ayahs */}
        {!loading && !error && (
          <div className="space-y-0">
            {ayahs.map((ayah, index) => (
              <div
                key={index}
                className="bg-amber-50/30 dark:bg-amber-950/10 py-6 px-6 border-b border-amber-100/50 dark:border-amber-900/20 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition"
              >
                {/* Ayah Text */}
                <div className="mb-4 text-right">
                  <p
                    className={`quran-font text-amber-950 dark:text-amber-50 leading-[2.2] ${
                      fontSize === 'lg'
                        ? 'text-lg'
                        : fontSize === 'xl'
                          ? 'text-xl'
                          : 'text-2xl'
                    }`}
                  >
                    {ayah.text}
                  </p>
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between gap-4">
                  {/* Ayah Number */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                    <span className="text-white dark:text-gray-900 font-bold text-sm">
                      {ayah.numberInSurah}
                    </span>
                  </div>

                  {/* Play Button */}
                  <button
                    onClick={() => playAyah(index)}
                    className={`flex-shrink-0 p-2 rounded-lg transition ${
                      currentlyPlaying === index
                        ? 'bg-amber-600 text-white dark:bg-amber-500'
                        : 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                    }`}
                  >
                    <Volume2 size={18} />
                  </button>

                  {/* Bookmark Button */}
                  {user && (
                    <button
                      onClick={() => toggleBookmark(ayah.numberInSurah)}
                      className={`flex-shrink-0 p-2 rounded-lg transition ${
                        bookmarks.has(ayah.numberInSurah)
                          ? 'bg-yellow-400 text-yellow-900 dark:bg-yellow-500'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Bookmark
                        size={18}
                        fill={bookmarks.has(ayah.numberInSurah) ? 'currentColor' : 'none'}
                      />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        {!loading && !error && (
          <div className="flex justify-between items-center mt-12 gap-4">
            <button
              onClick={() =>
                router.push(`/quran/${surahNumber - 1}`)
              }
              disabled={!prevSurah}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                prevSurah
                  ? 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
              }`}
            >
              <ChevronLeft size={18} />
              {prevSurah ? `${prevSurah.name}` : 'First Surah'}
            </button>

            <div className="flex-1 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Surah {surahNumber} of 114
              </p>
            </div>

            <button
              onClick={() =>
                router.push(`/quran/${surahNumber + 1}`)
              }
              disabled={!nextSurah}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                nextSurah
                  ? 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
              }`}
            >
              {nextSurah ? `${nextSurah.name}` : 'Last Surah'}
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
