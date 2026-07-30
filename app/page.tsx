'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { BookOpen, Users, ClipboardList, Gamepad2, Trophy, BarChart3, Star, Shield, Zap, Heart } from 'lucide-react'

export default function LandingPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && profile) {
      router.replace('/dashboard')
    }
  }, [loading, profile, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const features = [
    { icon: BookOpen, title: 'القرآن الكريم كاملاً', desc: 'تصفح وقراءة جميع سور القرآن مع تلاوات متعددة للقراء المشهورين', color: 'text-emerald-600' },
    { icon: ClipboardList, title: 'نظام الأوراد', desc: 'إدارة ومتابعة أوراد التحفيظ اليومية مع تقييم دقيق من المعلم', color: 'text-blue-600' },
    { icon: Gamepad2, title: 'ألعاب تعليمية', desc: 'تعلم بطريقة ممتعة من خلال ألعاب تفاعلية تقوي الحفظ والمراجعة', color: 'text-violet-600' },
    { icon: Trophy, title: 'نظام المكافآت', desc: 'اكسب نقاط XP والعملات وارتقِ في المستويات وافتح إنجازات جديدة', color: 'text-amber-600' },
    { icon: BarChart3, title: 'تقارير تفصيلية', desc: 'متابعة شاملة لتقدم الطلاب مع إحصائيات وتحليلات دقيقة', color: 'text-rose-600' },
    { icon: Users, title: 'إدارة الحلقات', desc: 'نظام متكامل لإدارة مجموعات التحفيظ والتواصل بين المعلم والطلاب', color: 'text-teal-600' },
  ]

  const stats = [
    { value: '١١٤', label: 'سورة قرآنية' },
    { value: '٦٢٣٦', label: 'آية كريمة' },
    { value: '٣٠', label: 'جزءاً' },
    { value: '٥', label: 'قراء مشهورون' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl hero-gradient flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">نور القرآن</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2">
              تسجيل الدخول
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-primary text-primary-foreground px-5 py-2 rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
            >
              انضم مجاناً
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-gradient islamic-pattern pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 rounded-full px-4 py-1.5 text-sm font-medium mb-8 border border-white/20">
            <Star className="w-4 h-4 text-amber-300" />
            منصة تحفيظ القرآن الأولى تفاعلياً
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            نور القرآن
            <span className="block text-2xl md:text-3xl font-normal text-white/80 mt-2">
              رحلتك نحو حفظ كلام الله
            </span>
          </h1>
          <p className="text-lg text-white/75 mb-10 max-w-2xl mx-auto leading-relaxed">
            منصة تعليمية متكاملة تجمع بين التحفيظ التقليدي والتقنيات الحديثة، مع نظام مكافآت يجعل الحفظ رحلة ممتعة ومثمرة
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-primary font-bold px-8 py-4 rounded-2xl hover:bg-white/95 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
            >
              ابدأ رحلتك الآن — مجاناً
            </Link>
            <Link
              href="/login"
              className="border-2 border-white/40 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-all"
            >
              لديك حساب؟ سجل دخولك
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-primary text-primary-foreground py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold mb-1">{s.value}</div>
                <div className="text-primary-foreground/75 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-4">كل ما تحتاجه في مكان واحد</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">منصة شاملة تخدم المعلمين والطلاب وتجعل رحلة التحفيظ أكثر تنظيماً وفاعلية</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="p-6 rounded-2xl border border-border bg-card card-hover">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-muted ${f.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* For whom */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">صُمِّمت لك</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl border-2 border-primary/20 bg-card">
              <div className="w-14 h-14 rounded-2xl hero-gradient flex items-center justify-center mb-5 shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">للمعلم والمعلمة</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                {['إدارة مجموعات الطلاب بسهولة', 'تعيين الأوراد ومتابعة التسليم', 'تقييم الطلاب وإضافة الملاحظات', 'تقارير تفصيلية عن كل طالب', 'إرسال إشعارات وتنبيهات'].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8 rounded-2xl border-2 border-amber-400/30 bg-card">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-5 shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">للطالب والطالبة</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                {['متابعة أوراد التحفيظ اليومية', 'ألعاب تفاعلية تقوي الحفظ', 'نظام XP والمستويات والعملات', 'بناء مدينة إسلامية افتراضية', 'لوحة شرف وإنجازات مميزة'].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="hero-gradient islamic-pattern py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <Heart className="w-12 h-12 text-white/80 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-4">ابدأ رحلتك مع القرآن اليوم</h2>
          <p className="text-white/75 mb-8 text-lg">انضم لآلاف الطلاب والمعلمين الذين يحفظون كلام الله بطريقة ممتعة ومنظمة</p>
          <Link
            href="/register"
            className="bg-white text-primary font-bold px-10 py-4 rounded-2xl hover:bg-white/95 transition-all shadow-xl inline-block hover:-translate-y-0.5"
          >
            إنشاء حساب مجاني
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border bg-card text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-7 h-7 rounded-lg hero-gradient flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-foreground">نور القرآن</span>
        </div>
        <p className="text-muted-foreground text-sm">منصة تحفيظ القرآن الكريم المتكاملة</p>
      </footer>
    </div>
  )
}
