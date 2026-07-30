'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SURAHS, searchSurahs } from '@/lib/quran-data';
import { Search, Grid3x3, List, Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SurahType = 'مكية' | 'مدنية';
type ViewMode = 'grid' | 'list';

export default function QuranPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | SurahType>('all');
  const [filterJuz, setFilterJuz] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [bookmarkedSurahs, setBookmarkedSurahs] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load bookmarks for current user
  useEffect(() => {
    const loadBookmarks = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('quran_bookmarks')
          .select('surah_number')
          .eq('user_id', user.id);

        if (error) throw error;

        // Create a set of unique surah numbers that have bookmarks
        const bookmarked = new Set(data?.map((b) => b.surah_number) || []);
        setBookmarkedSurahs(bookmarked);
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBookmarks();
  }, [user]);

  // Filter surahs based on search query
  let filteredSurahs = searchQuery
    ? searchSurahs(searchQuery)
    : SURAHS;

  // Filter by type
  if (filterType !== 'all') {
    filteredSurahs = filteredSurahs.filter(
      (surah) => surah.type === filterType
    );
  }

  // Filter by juz
  if (filterJuz !== null) {
    filteredSurahs = filteredSurahs.filter((surah) => surah.juz === filterJuz);
  }

  const handleToggleBookmark = async (surahNumber: number) => {
    if (!user) return;

    const isBookmarked = bookmarkedSurahs.has(surahNumber);

    try {
      if (isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from('quran_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('surah_number', surahNumber);

        if (error) throw error;

        const newBookmarked = new Set(bookmarkedSurahs);
        newBookmarked.delete(surahNumber);
        setBookmarkedSurahs(newBookmarked);
      } else {
        // Add bookmark (at ayah 1 as default)
        const { error } = await supabase
          .from('quran_bookmarks')
          .insert([
            {
              user_id: user.id,
              surah_number: surahNumber,
              ayah_number: 1,
            },
          ]);

        if (error) throw error;

        const newBookmarked = new Set(bookmarkedSurahs);
        newBookmarked.add(surahNumber);
        setBookmarkedSurahs(newBookmarked);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const typeLabel = {
    all: 'الكل',
    'مكية': 'مكية',
    'مدنية': 'مدنية',
  };

  const typeArabic = {
    'مكية': 'مكية',
    'مدنية': 'مدنية',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Hero Section */}
      <div className="hero-gradient text-white py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="quran-font text-4xl sm:text-5xl md:text-6xl font-bold mb-3 text-white">
            القرآن الكريم
          </h1>
          <p className="text-lg sm:text-xl text-emerald-50 mb-2">
            The Holy Quran
          </p>
          <p className="text-emerald-100">
            {filteredSurahs.length} من {SURAHS.length} سورة • {filteredSurahs.length} of {SURAHS.length} Surahs
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="ابحث عن سورة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 text-right"
              dir="rtl"
            />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center justify-between">
          {/* Filter Type */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'مكية', 'مدنية'] as const).map((type) => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(type)}
                className={cn(
                  filterType === type && 'bg-primary text-white'
                )}
              >
                {typeLabel[type]}
              </Button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded transition-colors',
                viewMode === 'grid'
                  ? 'bg-primary text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
              aria-label="Grid view"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded transition-colors',
                viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Juz Filter - Horizontal Scroll */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            <Button
              variant={filterJuz === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterJuz(null)}
              className={cn(
                filterJuz === null && 'bg-primary text-white'
              )}
            >
              جميع الأجزاء
            </Button>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
              <Button
                key={juz}
                variant={filterJuz === juz ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterJuz(juz)}
                className={cn(
                  'min-w-fit',
                  filterJuz === juz && 'bg-primary text-white'
                )}
              >
                ج{juz}
              </Button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 text-slate-600 dark:text-slate-400 text-sm">
          {filteredSurahs.length} نتيجة • {filteredSurahs.length} results
        </div>

        {/* Grid/List View */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredSurahs.map((surah) => {
              const isBookmarked = bookmarkedSurahs.has(surah.number);

              return (
                <Link key={surah.number} href={`/quran/${surah.number}`}>
                  <div className="card-hover bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 dark:border-slate-700 overflow-hidden h-full cursor-pointer group">
                    {/* Top Section with Badge */}
                    <div className="relative bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-slate-700 dark:to-slate-600 p-4 sm:p-5">
                      <div className="flex items-start justify-between">
                        <Badge className="bg-primary text-white text-lg font-bold h-10 w-10 flex items-center justify-center rounded-full">
                          {surah.number}
                        </Badge>
                        {user && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleToggleBookmark(surah.number);
                            }}
                            className="text-slate-400 hover:text-primary transition-colors"
                          >
                            {isBookmarked ? (
                              <BookmarkCheck className="w-5 h-5 text-primary" />
                            ) : (
                              <Bookmark className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-4 sm:p-5">
                      {/* Arabic Name */}
                      <h3 className="quran-font text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2 text-right">
                        {surah.name}
                      </h3>

                      {/* English Name */}
                      <p className="text-primary font-semibold mb-1">
                        {surah.englishName}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        {surah.englishNameTranslation}
                      </p>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-2 mb-3 justify-end">
                        <Badge variant="secondary" className="text-xs">
                          ج{surah.juz}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs border-primary text-primary"
                        >
                          {typeArabic[surah.type]}
                        </Badge>
                      </div>

                      {/* Ayah Count */}
                      <p className="text-sm text-slate-600 dark:text-slate-400 text-right">
                        {surah.ayahs} آية
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredSurahs.map((surah) => {
              const isBookmarked = bookmarkedSurahs.has(surah.number);

              return (
                <Link key={surah.number} href={`/quran/${surah.number}`}>
                  <div className="card-hover bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-primary transition-all duration-300 cursor-pointer p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Badge className="bg-primary text-white h-9 w-9 flex items-center justify-center rounded-full flex-shrink-0">
                          {surah.number}
                        </Badge>

                        <div className="flex-1 min-w-0 text-right">
                          <h3 className="quran-font text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                            {surah.name}
                          </h3>
                          <div className="flex flex-wrap gap-2 justify-end mt-1">
                            <span className="text-sm text-primary font-semibold">
                              {surah.englishName}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {surah.englishNameTranslation}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {surah.ayahs}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            آية
                          </p>
                        </div>

                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          ج{surah.juz}
                        </Badge>

                        <Badge
                          variant="outline"
                          className="text-xs border-primary text-primary flex-shrink-0"
                        >
                          {typeArabic[surah.type]}
                        </Badge>

                        {user && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleToggleBookmark(surah.number);
                            }}
                            className="text-slate-400 hover:text-primary transition-colors flex-shrink-0"
                          >
                            {isBookmarked ? (
                              <BookmarkCheck className="w-5 h-5 text-primary" />
                            ) : (
                              <Bookmark className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {filteredSurahs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">
              لا توجد نتائج
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              No results found for your search
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
