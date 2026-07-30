'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SURAHS } from '@/lib/quran-data';
import {
  Plus, Check, X, Calendar, BookOpen, Loader2, AlertCircle,
  AlertTriangle, TrendingDown, Clock,
} from 'lucide-react';

interface StudentProfile { id: string; name: string; role: 'teacher' | 'student'; teacher_id?: string }
interface StudentGroup { id: string; name: string }

interface StudentAssignment {
  id: string;
  student_id: string;
  teacher_id: string;
  surah_number: number;
  surah_name: string;
  ayah_from: number;
  ayah_to: number;
  repeats: number;
  repeats_done: number;
  due_date: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'overdue';
  notes?: string;
  penalty_xp: number;
  penalty_applied: boolean;
  created_at: string;
  student?: { name: string };
}

function isOverdue(dueDate: string) {
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export default function AssignmentsPage() {
  const { profile, refreshProfile, loading: authLoading } = useAuth();
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    surah: '',
    ayah_from: '',
    ayah_to: '',
    repeats: '3',
    due_date: '',
    penalty_xp: '20',
    assign_to: 'all' as 'all' | 'group' | 'student',
    group_id: '',
    student_id: '',
  });

  useEffect(() => { if (profile) { fetchAssignments(); } }, [profile]);
  useEffect(() => { if (profile?.role === 'teacher') fetchStudentsAndGroups(); }, [profile]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      if (profile?.role === 'teacher') {
        const { data, error: err } = await supabase
          .from('student_assignments')
          .select('id,student_id,teacher_id,surah_number,surah_name,ayah_from,ayah_to,repeats,repeats_done,due_date,status,notes,penalty_xp,penalty_applied,created_at,profiles:student_id(name)')
          .eq('teacher_id', profile.id)
          .order('created_at', { ascending: false });
        if (err) throw err;
        setAssignments(data?.map((d: any) => ({ ...d, student: d.profiles })) || []);
      } else {
        const { data, error: err } = await supabase
          .from('student_assignments')
          .select('*')
          .eq('student_id', profile?.id)
          .order('due_date', { ascending: true });
        if (err) throw err;

        // Apply penalties for overdue assignments client-side
        const toDeduct = (data || []).filter(
          (a) => isOverdue(a.due_date) && a.status === 'pending' && !a.penalty_applied
        );
        for (const a of toDeduct) {
          await applyPenalty(a);
        }

        const { data: fresh } = await supabase
          .from('student_assignments')
          .select('*')
          .eq('student_id', profile?.id)
          .order('due_date', { ascending: true });
        setAssignments(fresh || []);
      }
    } catch (err) {
      console.error(err);
      setError('خطأ في تحميل الواجبات');
    } finally {
      setLoading(false);
    }
  };

  const applyPenalty = async (assignment: StudentAssignment) => {
    if (!profile?.id) return;
    await supabase
      .from('student_assignments')
      .update({ status: 'overdue', penalty_applied: true })
      .eq('id', assignment.id);

    const { data: prof } = await supabase.from('profiles').select('xp').eq('id', profile.id).single();
    if (prof) {
      const newXp = Math.max(0, (prof.xp || 0) - assignment.penalty_xp);
      await supabase.from('profiles').update({ xp: newXp }).eq('id', profile.id);
    }

    await supabase.from('notifications').insert({
      user_id: profile.id,
      title: 'تجاوزت موعد الواجب',
      body: `لم تُسلّم ورد سورة ${assignment.surah_name} في الموعد. خُصم ${assignment.penalty_xp} نقطة XP من رصيدك.`,
      type: 'assignment',
      read: false,
    });

    await refreshProfile();
  };

  const fetchStudentsAndGroups = async () => {
    const { data: s } = await supabase.from('profiles').select('id,name,role,teacher_id').eq('role', 'student').eq('teacher_id', profile?.id);
    setStudents(s || []);
    const { data: g } = await supabase.from('groups').select('id,name').eq('teacher_id', profile?.id);
    setGroups(g || []);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    const surah = SURAHS.find((s) => s.number === parseInt(formData.surah));
    if (!surah) { setError('اختر سورة صحيحة'); return; }

    try {
      setSubmitting(true); setError(null);
      const baseData = {
        surah_number: surah.number, surah_name: surah.name,
        ayah_from: parseInt(formData.ayah_from), ayah_to: parseInt(formData.ayah_to),
        repeats: parseInt(formData.repeats), repeats_done: 0,
        due_date: formData.due_date, status: 'pending', teacher_id: profile.id,
        penalty_xp: parseInt(formData.penalty_xp) || 20, penalty_applied: false,
      };

      let studentsToAssign: string[] = [];
      if (formData.assign_to === 'all') {
        studentsToAssign = students.map((s) => s.id);
      } else if (formData.assign_to === 'student') {
        if (!formData.student_id) { setError('اختر طالباً'); return; }
        studentsToAssign = [formData.student_id];
      } else if (formData.assign_to === 'group') {
        if (!formData.group_id) { setError('اختر مجموعة'); return; }
        const { data: members } = await supabase.from('group_members').select('student_id').eq('group_id', formData.group_id);
        studentsToAssign = members?.map((m) => m.student_id) || [];
      }

      if (studentsToAssign.length === 0) { setError('لا يوجد طلاب للتعيين'); return; }

      const { error: insertErr } = await supabase.from('student_assignments').insert(
        studentsToAssign.map((id) => ({ ...baseData, student_id: id }))
      );
      if (insertErr) throw insertErr;

      // Send notification to each student
      await supabase.from('notifications').insert(
        studentsToAssign.map((id) => ({
          user_id: id,
          title: 'ورد جديد',
          body: `تم تكليفك بورد سورة ${surah.name} (الآيات ${formData.ayah_from}–${formData.ayah_to}) — يُسلَّم قبل ${new Date(formData.due_date).toLocaleDateString('ar-SA')}`,
          type: 'assignment', read: false,
        }))
      );

      setFormData({ surah: '', ayah_from: '', ayah_to: '', repeats: '3', due_date: '', penalty_xp: '20', assign_to: 'all', group_id: '', student_id: '' });
      setShowModal(false);
      await fetchAssignments();
    } catch (err) {
      console.error(err); setError('خطأ في إنشاء الواجب');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAssignment = async (assignmentId: string) => {
    try {
      const { data: a } = await supabase.from('student_assignments').select('student_id,surah_name').eq('id', assignmentId).single();
      if (!a) return;
      await supabase.from('student_assignments').update({ status: 'approved' }).eq('id', assignmentId);
      const { data: prof } = await supabase.from('profiles').select('xp,coins').eq('id', a.student_id).single();
      if (prof) await supabase.from('profiles').update({ xp: (prof.xp || 0) + 50, coins: (prof.coins || 0) + 20 }).eq('id', a.student_id);
      await supabase.from('notifications').insert({ user_id: a.student_id, title: 'تم قبول الورد', body: `تم قبول ورد سورة ${a.surah_name}. حصلت على 50 XP و 20 عملة!`, type: 'assignment', read: false });
      await fetchAssignments();
    } catch (err) { setError('خطأ في قبول الواجب'); }
  };

  const handleRejectAssignment = async (assignmentId: string) => {
    try {
      const { data: a } = await supabase.from('student_assignments').select('student_id,surah_name').eq('id', assignmentId).single();
      if (!a) return;
      await supabase.from('student_assignments').update({ status: 'rejected' }).eq('id', assignmentId);
      await supabase.from('notifications').insert({ user_id: a.student_id, title: 'تم رفض الورد', body: `تم رفض ورد سورة ${a.surah_name}. يرجى المراجعة والإعادة.`, type: 'assignment', read: false });
      await fetchAssignments();
    } catch (err) { setError('خطأ في رفض الواجب'); }
  };

  const handleIncrementRepeats = async (id: string, done: number, max: number) => {
    if (done >= max) return;
    await supabase.from('student_assignments').update({ repeats_done: done + 1, status: 'in_progress' }).eq('id', id);
    await fetchAssignments();
  };

  const handleSubmitAssignment = async (id: string) => {
    await supabase.from('student_assignments').update({ status: 'submitted' }).eq('id', id);
    await fetchAssignments();
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const isTeacher = profile.role === 'teacher';

  const statusLabels: Record<string, { ar: string; color: string }> = {
    pending:    { ar: 'معلّق',              color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
    in_progress:{ ar: 'قيد الإنجاز',       color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
    submitted:  { ar: 'بانتظار المراجعة',  color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
    approved:   { ar: 'مقبول',             color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
    rejected:   { ar: 'مرفوض',             color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
    overdue:    { ar: 'فات الميعاد',       color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  };

  const ORDER: StudentAssignment['status'][] = ['submitted', 'in_progress', 'pending', 'overdue', 'rejected', 'approved'];
  const grouped = ORDER.reduce((acc, s) => {
    acc[s] = assignments.filter(a => a.status === s);
    return acc;
  }, {} as Record<string, StudentAssignment[]>);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">{isTeacher ? 'الأوراد المكلَّفة' : 'أوراد التحفيظ'}</h1>
            <p className="text-muted-foreground text-sm">{isTeacher ? 'إدارة أوراد طلابك' : 'تابع أوراد التحفيظ اليومية'}</p>
          </div>
          {isTeacher && (
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl transition-colors text-sm font-semibold shadow-sm">
              <Plus className="w-4 h-4" /> إضافة ورد جديد
            </button>
          )}
        </div>

        {/* Penalty notice for students */}
        {!isTeacher && (
          <div className="mb-6 p-4 rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">تنبيه: خصم النقاط عند التأخر</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">إذا لم تُسلِّم الورد في الموعد المحدد، سيتم خصم نقاط XP من رصيدك تلقائياً.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-5 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Create Assignment Modal */}
        {isTeacher && showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="hero-gradient text-white p-6 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-xl font-bold">إضافة ورد جديد</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="p-6 space-y-5">
                {/* Surah */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">السورة</label>
                  <select value={formData.surah} onChange={e => setFormData({ ...formData, surah: e.target.value })} required
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-sm">
                    <option value="">اختر سورة</option>
                    {SURAHS.map(s => <option key={s.number} value={s.number}>{s.number} - {s.name}</option>)}
                  </select>
                </div>

                {/* Ayah Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">من الآية</label>
                    <input type="number" value={formData.ayah_from} onChange={e => setFormData({ ...formData, ayah_from: e.target.value })} required min="1"
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">إلى الآية</label>
                    <input type="number" value={formData.ayah_to} onChange={e => setFormData({ ...formData, ayah_to: e.target.value })} required min="1"
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-sm" />
                  </div>
                </div>

                {/* Repeats + Penalty side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">عدد التكرارات</label>
                    <input type="number" value={formData.repeats} onChange={e => setFormData({ ...formData, repeats: e.target.value })} required min="1"
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      <span className="flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5 text-red-500" />خصم XP عند التأخر</span>
                    </label>
                    <input type="number" value={formData.penalty_xp} onChange={e => setFormData({ ...formData, penalty_xp: e.target.value })} required min="0"
                      className="w-full px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-800 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-colors text-sm" />
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">تاريخ الاستحقاق</label>
                  <input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-sm" />
                </div>

                {/* Assign To */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">تعيين لـ</label>
                  <div className="flex gap-3">
                    {(['all', 'group', 'student'] as const).map(opt => (
                      <label key={opt} className={`flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium ${formData.assign_to === opt ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                        <input type="radio" name="assign_to" value={opt} checked={formData.assign_to === opt} onChange={() => setFormData({ ...formData, assign_to: opt })} className="hidden" />
                        {opt === 'all' ? 'الكل' : opt === 'group' ? 'مجموعة' : 'طالب'}
                      </label>
                    ))}
                  </div>
                </div>

                {formData.assign_to === 'group' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">المجموعة</label>
                    <select value={formData.group_id} onChange={e => setFormData({ ...formData, group_id: e.target.value })} required
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-sm">
                      <option value="">اختر مجموعة</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                )}

                {formData.assign_to === 'student' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">الطالب</label>
                    <select value={formData.student_id} onChange={e => setFormData({ ...formData, student_id: e.target.value })} required
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-sm">
                      <option value="">اختر طالباً</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted transition-colors text-sm font-medium">
                    إلغاء
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting ? 'جاري...' : 'إنشاء الورد'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assignment Groups */}
        <div className="space-y-8">
          {ORDER.map(status => {
            const items = grouped[status] || [];
            if (items.length === 0) return null;
            const { ar: label, color } = statusLabels[status];

            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-4">
                  {status === 'overdue' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  <h2 className="text-lg font-bold text-foreground">{label}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold">{items.length}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map(a => {
                    const daysLeft = Math.ceil((new Date(a.due_date).getTime() - Date.now()) / 86400000);
                    const overdueSelf = isOverdue(a.due_date) && a.status !== 'approved';
                    const progressPct = a.repeats > 0 ? (a.repeats_done / a.repeats) * 100 : 0;

                    return (
                      <div key={a.id} className={`bg-card border rounded-2xl p-5 transition-shadow hover:shadow-md ${overdueSelf && !a.penalty_applied ? 'border-red-300 dark:border-red-800' : 'border-border'}`}>
                        {/* Top row */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <BookOpen className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
                            </div>
                            <div>
                              <h3 className="font-bold text-foreground text-sm">سورة {a.surah_name}</h3>
                              <p className="text-xs text-muted-foreground">الآيات {a.ayah_from}–{a.ayah_to}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${color}`}>{label}</span>
                        </div>

                        {/* Student name (teacher view) */}
                        {isTeacher && a.student && (
                          <p className="text-xs text-muted-foreground mb-3 bg-muted/50 px-2.5 py-1.5 rounded-lg">
                            الطالب: <span className="font-semibold text-foreground">{a.student.name}</span>
                          </p>
                        )}

                        {/* Progress */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>التكرارات</span>
                            <span className="font-semibold text-primary">{a.repeats_done}/{a.repeats}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>

                        {/* Due date + penalty */}
                        <div className="flex items-center justify-between text-xs mb-4">
                          <div className={`flex items-center gap-1 ${overdueSelf ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                            <Clock className="w-3.5 h-3.5" />
                            {overdueSelf ? 'فات الموعد' : daysLeft === 0 ? 'آخر اليوم' : daysLeft > 0 ? `${daysLeft} يوم متبقي` : 'فات الموعد'}
                          </div>
                          {a.penalty_xp > 0 && (
                            <div className="flex items-center gap-1 text-red-500">
                              <TrendingDown className="w-3.5 h-3.5" />
                              {a.penalty_applied ? (
                                <span className="line-through opacity-60">-{a.penalty_xp} XP</span>
                              ) : (
                                <span>خصم -{a.penalty_xp} XP</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {isTeacher ? (
                          a.status === 'submitted' && (
                            <div className="flex gap-2">
                              <button onClick={() => handleApproveAssignment(a.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors text-xs font-bold">
                                <Check className="w-3.5 h-3.5" /> قبول
                              </button>
                              <button onClick={() => handleRejectAssignment(a.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors text-xs font-bold">
                                <X className="w-3.5 h-3.5" /> رفض
                              </button>
                            </div>
                          )
                        ) : (
                          (a.status === 'pending' || a.status === 'in_progress') && (
                            <div className="space-y-2">
                              {a.repeats_done < a.repeats && (
                                <button onClick={() => handleIncrementRepeats(a.id, a.repeats_done, a.repeats)}
                                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-colors text-xs font-bold">
                                  <Plus className="w-3.5 h-3.5" /> تكرار آخر ({a.repeats_done}/{a.repeats})
                                </button>
                              )}
                              {a.repeats_done >= a.repeats && (
                                <button onClick={() => handleSubmitAssignment(a.id)}
                                  className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors text-xs font-bold">
                                  تسليم الورد
                                </button>
                              )}
                            </div>
                          )
                        )}

                        {/* Penalty applied notice */}
                        {a.penalty_applied && a.status === 'overdue' && !isTeacher && (
                          <div className="mt-3 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
                            <TrendingDown className="w-3.5 h-3.5" />
                            تم خصم {a.penalty_xp} XP بسبب التأخر
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {assignments.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{isTeacher ? 'لم تقم بتعيين أي أوراد بعد' : 'لا توجد أوراد في الوقت الحالي'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
