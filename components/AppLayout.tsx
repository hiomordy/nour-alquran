'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from 'next-themes'
import { getLevelInfo, getLevelTitle } from '@/lib/supabase'
import {
  LayoutDashboard, BookOpen, ClipboardList, ClipboardCheck, Gamepad2,
  Building2, ShoppingBag, Trophy, Bell, Users, FolderOpen,
  BarChart3, LogOut, Menu, X, Moon, Sun, Coins, Star,
  ChevronRight, Sparkles, Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const teacherNav = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/students', label: 'الطلاب', icon: Users },
  { href: '/groups', label: 'المجموعات', icon: FolderOpen },
  { href: '/assignments', label: 'الأوراد', icon: ClipboardList },
  { href: '/quiz', label: 'الاختبارات', icon: ClipboardCheck },
  { href: '/quran', label: 'القرآن الكريم', icon: BookOpen },
  { href: '/live', label: 'الفصول المباشرة', icon: Video },
  { href: '/reports', label: 'التقارير', icon: BarChart3 },
  { href: '/notifications', label: 'الإشعارات', icon: Bell },
]

const studentNav = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/quran', label: 'القرآن الكريم', icon: BookOpen },
  { href: '/assignments', label: 'أوراد اليوم', icon: ClipboardList },
  { href: '/quiz', label: 'الاختبارات', icon: ClipboardCheck },
  { href: '/games', label: 'الألعاب', icon: Gamepad2 },
  { href: '/world', label: 'مدينتي', icon: Building2 },
  { href: '/store', label: 'المتجر', icon: ShoppingBag },
  { href: '/achievements', label: 'الإنجازات', icon: Trophy },
  { href: '/live', label: 'الفصول المباشرة', icon: Video },
  { href: '/notifications', label: 'الإشعارات', icon: Bell },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()

  const nav = profile?.role === 'teacher' ? teacherNav : studentNav
  const levelInfo = profile ? getLevelInfo(profile.xp) : null
  const levelTitle = profile ? getLevelTitle(profile.level) : ''

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl hero-gradient flex items-center justify-center shadow-lg">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-foreground text-sm leading-tight">نور القرآن</div>
            <div className="text-xs text-muted-foreground">منصة التحفيظ</div>
          </div>
        </Link>
      </div>

      {/* Profile card */}
      {profile && (
        <div className="p-4 mx-3 mt-4 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full hero-gradient flex items-center justify-center text-white font-bold text-sm shadow">
              {profile.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground text-sm truncate">{profile.name}</div>
              <div className="text-xs text-primary font-medium">{levelTitle}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-primary">Lv.{profile.level}</div>
            </div>
          </div>
          {levelInfo && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{levelInfo.currentXp} XP</span>
                <span>{levelInfo.nextLevelXp} XP</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${levelInfo.progress}%` }}
                />
              </div>
            </div>
          )}
          {profile.role === 'student' && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-primary/10">
              <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <Coins className="w-3.5 h-3.5" />
                {profile.coins}
              </div>
              <div className="flex items-center gap-1 text-xs text-primary font-medium">
                <Star className="w-3.5 h-3.5" />
                {profile.xp} XP
              </div>
              {profile.streak_days > 0 && (
                <div className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  {profile.streak_days} أيام
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-3 mt-2 overflow-y-auto">
        <div className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" style={{ width: '18px', height: '18px' }} />
                <span>{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 mr-auto opacity-60" />}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-border space-y-1">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          {theme === 'dark' ? <Sun className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} /> : <Moon className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />}
          {theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
        >
          <LogOut className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />
          تسجيل الخروج
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-l border-border bg-card shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-72 bg-card border-l border-border shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 rounded-lg hero-gradient flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-foreground">نور القرآن</span>
          </div>
          {profile?.role === 'student' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <Coins className="w-3.5 h-3.5" />
                {profile.coins}
              </div>
              <div className="flex items-center gap-1 text-xs text-primary font-medium">
                <Star className="w-3.5 h-3.5" />
                {profile.xp}
              </div>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
