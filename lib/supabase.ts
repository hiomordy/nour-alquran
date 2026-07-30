import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  role: 'teacher' | 'student'
  name: string
  avatar_url?: string
  teacher_id?: string
  level: number
  xp: number
  coins: number
  streak_days: number
  last_active_date?: string
  city_theme: string
  created_at: string
  updated_at: string
}

export function getLevelInfo(xp: number) {
  const base = 100
  let level = 1
  let total = 0
  while (true) {
    const needed = Math.floor(base * Math.pow(1.3, level - 1))
    if (xp < total + needed) {
      return {
        level,
        currentXp: xp - total,
        nextLevelXp: needed,
        progress: Math.round(((xp - total) / needed) * 100),
      }
    }
    total += needed
    level++
    if (level > 100) break
  }
  return { level: 100, currentXp: 0, nextLevelXp: 0, progress: 100 }
}

export function getLevelTitle(level: number): string {
  if (level >= 50) return 'حافظ القرآن'
  if (level >= 40) return 'الحافظ المتميز'
  if (level >= 30) return 'طالب متقدم'
  if (level >= 20) return 'طالب مجتهد'
  if (level >= 15) return 'طالب نشيط'
  if (level >= 10) return 'طالب متحمس'
  if (level >= 5) return 'مبتدئ متقدم'
  return 'مبتدئ'
}
