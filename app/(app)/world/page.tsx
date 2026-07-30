'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Coins, Lock, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getLevelInfo } from '@/lib/supabase';

interface VirtualItem {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  coin_price: number;
  level_required: number;
}

interface StudentInventory {
  id: string;
  student_id: string;
  item_id: string;
  purchased_at: string;
}

interface PlayerStats {
  level: number;
  xp: number;
  coins: number;
  city_name: string;
}

export default function WorldPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    level: 1,
    xp: 0,
    coins: 0,
    city_name: 'مدينتي الإسلامية'
  });
  const [buildings, setBuildings] = useState<VirtualItem[]>([]);
  const [ownedItems, setOwnedItems] = useState<Map<string, boolean>>(new Map());
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

  async function fetchData() {
    try {
      setLoadingState(true);

      const levelInfo = getLevelInfo(profile?.xp || 0);
      setPlayerStats({
        level: levelInfo.level,
        xp: profile?.xp || 0,
        coins: profile?.coins || 0,
        city_name: 'مدينتي الإسلامية'
      });

      const { data: buildingsData, error: buildingsError } = await supabase
        .from('virtual_items')
        .select('*')
        .eq('category', 'building')
        .order('sort_order', { ascending: true });

      if (buildingsError) throw buildingsError;
      setBuildings(buildingsData || []);

      const { data: inventoryData, error: inventoryError } = await supabase
        .from('student_inventory')
        .select('item_id')
        .eq('student_id', user?.id);

      if (inventoryError) throw inventoryError;

      const ownedMap = new Map(
        (inventoryData || []).map(item => [item.item_id, true])
      );
      setOwnedItems(ownedMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingState(false);
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

  const levelInfo = getLevelInfo(playerStats.xp);
  const xpProgress = levelInfo.nextLevelXp > 0 ? levelInfo.currentXp / levelInfo.nextLevelXp : 1;

  const cityGrid = Array(20).fill(null).map((_, index) => {
    const ownedItem = buildings.find(b => ownedItems.has(b.id) && buildings.indexOf(b) === index);
    return ownedItem;
  });

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-12">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Card */}
        <div className="hero-gradient rounded-2xl p-8 mb-8 shadow-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Level */}
            <div className="bg-white bg-opacity-90 rounded-lg p-4 text-center">
              <p className="text-emerald-600 text-sm font-cairo mb-2">المستوى</p>
              <p className="text-3xl font-bold text-emerald-700 font-cairo">{playerStats.level}</p>
            </div>

            {/* Coins */}
            <div className="bg-white bg-opacity-90 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Coins className="w-4 h-4 text-yellow-500" />
                <p className="text-emerald-600 text-sm font-cairo">العملات</p>
              </div>
              <p className="text-3xl font-bold text-emerald-700 font-cairo">{playerStats.coins}</p>
            </div>

            {/* XP Bar */}
            <div className="col-span-2">
              <p className="text-emerald-600 text-sm font-cairo mb-2">نقاط الخبرة</p>
              <div className="bg-white bg-opacity-90 rounded-full h-8 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full flex items-center justify-center text-white text-xs font-cairo transition-all duration-300"
                  style={{ width: `${xpProgress * 100}%` }}
                >
                  {xpProgress > 0.3 && `${Math.round(xpProgress * 100)}%`}
                </div>
              </div>
              <p className="text-xs text-emerald-600 mt-1 font-cairo">
                {levelInfo.currentXp} / {levelInfo.nextLevelXp}
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-3xl font-bold text-white font-cairo drop-shadow-lg">
              {playerStats.city_name}
            </h1>
          </div>
        </div>

        {/* City Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-emerald-800 mb-6 font-cairo">مدينتك</h2>
          <div className="grid grid-cols-5 gap-4">
            {Array(20).fill(null).map((_, index) => {
              const ownedItem = buildings.find(b => ownedItems.has(b.id) && Array.from(ownedItems.keys()).indexOf(b.id) === index);

              return (
                <div
                  key={index}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-center p-2 transition-all ${
                    ownedItem
                      ? 'bg-emerald-100 border-2 border-emerald-300 card-hover'
                      : 'bg-white border-2 border-dashed border-emerald-200'
                  }`}
                >
                  {ownedItem ? (
                    <>
                      <span className="text-4xl mb-1">{ownedItem.icon}</span>
                      <p className="text-xs font-cairo text-emerald-700 line-clamp-2">
                        {ownedItem.name}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-emerald-300 font-cairo">فارغة</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Shop Section */}
        <div>
          <h2 className="text-2xl font-bold text-emerald-800 mb-6 font-cairo flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600" />
            المباني المتاحة للشراء
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buildings.map(item => {
              const isOwned = ownedItems.has(item.id);
              const canAfford = playerStats.coins >= item.coin_price;
              const meetsLevel = playerStats.level >= item.level_required;
              const canPurchase = canAfford && meetsLevel && !isOwned;

              return (
                <div
                  key={item.id}
                  className="card-hover bg-white rounded-xl p-4 border-2 border-emerald-100 shadow-sm transition-all"
                >
                  <div className="text-5xl mb-3 text-center">{item.icon}</div>
                  <h3 className="font-bold text-emerald-800 mb-1 font-cairo text-center">{item.name}</h3>
                  <p className="text-sm text-emerald-600 mb-3 font-cairo text-center">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between mb-3 text-sm">
                    <span className="flex items-center gap-1 text-yellow-600 font-cairo">
                      <Coins className="w-4 h-4" />
                      {item.coin_price}
                    </span>
                    {item.level_required > 1 && (
                      <span className="flex items-center gap-1 text-emerald-600 font-cairo">
                        <Lock className="w-4 h-4" />
                        المستوى {item.level_required}
                      </span>
                    )}
                  </div>

                  {isOwned ? (
                    <div className="w-full bg-emerald-100 text-emerald-700 rounded-lg py-2 text-center font-cairo flex items-center justify-center gap-2 text-sm">
                      <Check className="w-4 h-4" />
                      مملوك
                    </div>
                  ) : canPurchase ? (
                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={purchasingId === item.id}
                      className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg py-2 font-cairo font-semibold transition-all disabled:opacity-50"
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
