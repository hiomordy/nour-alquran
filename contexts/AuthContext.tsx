'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, Profile } from '@/lib/supabase'

type AuthContextType = {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string, role: 'teacher' | 'student', teacherName?: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signUp(email: string, password: string, name: string, role: 'teacher' | 'student', teacherName?: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    if (!data.user) return { error: 'فشل إنشاء الحساب' }

    let teacherId: string | null = null
    if (role === 'student' && teacherName) {
      const { data: teacher } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'teacher')
        .ilike('name', teacherName.trim())
        .maybeSingle()
      teacherId = teacher?.id ?? null
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      name,
      role,
      level: 1,
      xp: 0,
      coins: 100,
      streak_days: 0,
      city_theme: 'desert',
      teacher_id: teacherId,
    })

    if (profileError) return { error: profileError.message }

    // Send notification to teacher when student joins
    if (role === 'student' && teacherId && teacherName) {
      // Create a pending request record
      await supabase.from('teacher_requests').insert({
        student_id: data.user.id,
        teacher_id: teacherId,
        student_name: name,
        status: 'pending',
        created_at: new Date().toISOString(),
      })

      // Send notification to teacher
      await supabase.from('notifications').insert({
        user_id: teacherId,
        title: 'طالب جديد يريد الانضمام',
        body: `طالب باسم "${name}" يريد الانضمام إلى مجموعتك. يرجى قبول الطالب من صفحة الطلاب.`,
        type: 'student_join_request',
        read: false,
        created_at: new Date().toISOString(),
      })
    }

    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
