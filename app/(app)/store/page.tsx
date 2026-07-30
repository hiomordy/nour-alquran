'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Coins, Lock, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface VirtualItem {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  coin_price: number;
  level_required: number;
  sort_order: number;
}

interface PlayerStats {
  coins: number;
  level: number;
}

type CategoryType = 'building' | 'decoration' | 'avatar';

const CATEGORIES: { value: CategoryType; label: string; labelAr: string }[] = [
  { value: 'building', label: 'Buildings', labelAr: 'مباني' },
  { value: 'decoration', label: 'Decorations', labelAr: 'ديكور' },
  { value: 'avatar', label: 'Avatars', labelAr: 'أفاتار' }
];

export default function StorePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<CategoryType>('building');
  const [items, setItems] = useState<VirtualItem[]>([]);
  const [ownedItems, setOwnedItems] = useState<Map<string, boolean>>(new Map());
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    coins: 0,
    level: 1
  });
  const [loadingState, setLoadingState] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (profile?.role === 'teacher') {
      return;
    }

    fetchData();
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user || loadingState) return;
    fetchItemsByCategory(activeCategory);
  }, [activeCategory, user, loadingState]);

  async function fetchData() {
    try {
      setLoadingState(true);

      setPlayerStats({
        coins: profile?.coins || 0,
        level: profile?.xp ? Math.max(1, Math.floor(profile.xp / 100) + 1) : 1
      });

      const { data: inventoryData, error: inventoryError } = await supabase
        .from('student_inventory')
        .select('item_id')
        .eq('student_id', user?.id);

      if (inventoryError) throw inventoryError;

      const ownedMap = new Map(
        (inventoryData || []).map(item => [item.item_id, true])
      );
      setOwnedItems(ownedMap);

      await fetchItemsByCategory('building');
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingState(false);
    }
  }

  async function fetchItemsByCategory(category: CategoryType) {
    try {
      const { data, error } = await supabase
        .from('virtual_items')
        .select('*')
        .eq('category', category)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  }

  async function handlePurchase(item: VirtualItem) {
    if (!user || purchasingId === item.id) return;

    if (playerStats.coins < item.coin_price || playerStats.level < item.level_required) {
      return;
    }

    try {
      setPurchasingId(item.id);

      const { error: inventoryError } = await supabase
        .from('student_inventory')
        .insert([
          {
            student_id: user.id,
            item_id: item.id,
            purchased_at: new Date().toISOString()
          }
        ]);

      if (inventoryError) throw inventoryError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ coins: playerStats.coins - item.coin_price })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setPlayerStats(prev => ({
        ...prev,
        coins: prev.coins - item.coin_price
      }));

      const newOwnedMap = new Map(ownedItems);
      newOwnedMap.set(item.id, true);
      setOwnedItems(newOwnedMap);
    } catch (error) {
      console.error('Error purchasing item:', error);
    } finally {
      setPurchasingId(null);
    }
  }

  if (loading || loadingState) {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-emerald-600 font-cairo">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (profile?.role === 'teacher') {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-emerald-600 font-cairo text-lg">هذه الميزة للطلاب فقط</p>
        </div>
      </div>
    );
  }

  const filteredItems = items;

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-emerald-800 font-cairo flex items-center gap-2">
              <ShoppingBag className="w-8 h-8 text-emerald-600" />
              المتجر
            </h1>

            <div className="hero-gradient rounded-xl px-6 py-3 shadow-md">
              <div className="flex items-center gap-2">
                <Coins className="w-6 h-6 text-yellow-300" />
                <span className="text-2xl font-bold text-white font-cairo">
                  {playerStats.coins}
                </span>
                <span className="text-white text-sm font-cairo">عملة</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-8">
          <div className="flex gap-3 border-b-2 border-emerald-200 overflow-x-auto pb-4">
            {CATEGORIES.map(category => (
              <button
                key={category.value}
                onClick={() => setActiveCategory(category.value)}
                className={`px-6 py-2 rounded-t-lg font-cairo font-semibold transition-all whitespace-nowrap ${
                  activeCategory === category.value
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white text-emerald-700 border-2 border-emerald-200 hover:border-emerald-400'
                }`}
              >
                {category.labelAr}
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        <div>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-emerald-600 font-cairo text-lg">لا توجد عناصر متاحة</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map(item => {
                const isOwned = ownedItems.has(item.id);
                const canAfford = playerStats.coins >= item.coin_price;
                const meetsLevel = playerStats.level >= item.level_required;
                const canPurchase = canAfford && meetsLevel && !isOwned;

                return (
                  <div
                    key={item.id}
                    className="card-hover bg-white rounded-xl overflow-hidden border-2 border-emerald-100 shadow-sm transition-all"
                  >
                    <div className="bg-gradient-to-b from-emerald-50 to-transparent p-6 flex items-center justify-center min-h-32">
                      <span className="text-6xl">{item.icon}</span>
                    </div>

                    <div className="p-4">
                      <h3 className="font-bold text-emerald-800 mb-1 font-cairo text-center line-clamp-2">
                        {item.name}
                      </h3>
                      <p className="text-sm text-emerald-600 mb-4 font-cairo text-center line-clamp-2">
                        {item.description}
                      </p>

                      <div className="flex flex-col gap-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1 text-yellow-600 font-cairo font-semibold">
                            <Coins className="w-4 h-4" />
                            {item.coin_price}
                          </span>
                          {item.level_required > 1 && (
                            <span className="flex items-center gap-1 text-emerald-600 font-cairo font-semibold">
                              <Lock className="w-4 h-4" />
                              المستوى {item.level_required}
                            </span>
                          )}
                        </div>
                      </div>

                      {isOwned ? (
                        <div className="w-full bg-emerald-100 text-emerald-700 rounded-lg py-2 text-center font-cairo flex items-center justify-center gap-2 text-sm font-semibold">
                          <Check className="w-4 h-4" />
                          مملوك
                        </div>
                      ) : canPurchase ? (
                        <button
                          onClick={() => handlePurchase(item)}
                          disabled={purchasingId === item.id}
                          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg py-2 font-cairo font-semibold transition-all disabled:opacity-50 text-sm"
                        >
                          {purchasingId === item.id ? 'جاري الشراء...' : 'شراء'}
                        </button>
                      ) : !canAfford ? (
                        <button
                          disabled
                          className="w-full bg-red-100 text-red-700 rounded-lg py-2 font-cairo font-semibold text-sm"
                        >
                          رصيد غير كافٍ
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full bg-amber-100 text-amber-700 rounded-lg py-2 font-cairo font-semibold text-sm"
                        >
                          المستوى {item.level_required} مطلوب
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
