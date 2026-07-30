'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';

interface StatData {
  total_assignments: number;
  completion_rate: number;
  avg_score: number;
  active_students: number;
}

interface StudentPerformance {
  id: string;
  name: string;
  assignments_done: number;
  completion_rate: number;
  avg_note_score: number;
  last_active: string;
}

interface ChartDataPoint {
  name: string;
  value: number;
  count?: number;
}

interface StatusDistribution {
  name: string;
  value: number;
}

const COLORS = ['#059669', '#0891b2', '#f59e0b', '#ef4444'];

export default function ReportsPage() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('7days');
  const [stats, setStats] = useState<StatData>({
    total_assignments: 0,
    completion_rate: 0,
    avg_score: 0,
    active_students: 0,
  });
  const [weeklyData, setWeeklyData] = useState<ChartDataPoint[]>([]);
  const [statusData, setStatusData] = useState<StatusDistribution[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchReportData();
    }
  }, [user?.id, dateRange]);

  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();

    if (dateRange === '7days') {
      startDate.setDate(now.getDate() - 7);
    } else if (dateRange === '30days') {
      startDate.setDate(now.getDate() - 30);
    } else {
      startDate = new Date('2000-01-01');
    }

    return {
      start: startDate.toISOString(),
      end: now.toISOString(),
    };
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      // Fetch assignments data
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('student_assignments')
        .select('*')
        .eq('teacher_id', user?.id)
        .gte('created_at', start)
        .lte('created_at', end);

      if (assignmentsError) throw assignmentsError;

      // Fetch notes data
      const { data: notesData, error: notesError } = await supabase
        .from('notes_records')
        .select('*')
        .eq('teacher_id', user?.id)
        .gte('created_at', start)
        .lte('created_at', end);

      if (notesError) throw notesError;

      // Fetch student profiles
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('id, name, last_active')
        .eq('teacher_id', user?.id);

      if (studentsError) throw studentsError;

      // Process stats
      const totalAssignments = assignmentsData?.length || 0;
      const completedAssignments = assignmentsData?.filter((a) => a.status === 'completed')
        .length || 0;
      const completionRate =
        totalAssignments > 0
          ? Math.round((completedAssignments / totalAssignments) * 100)
          : 0;

      const avgScore =
        notesData && notesData.length > 0
          ? Math.round(
              notesData.reduce(
                (sum, note) =>
                  sum +
                  (note.tajweed_score +
                    note.memorization_score +
                    note.behavior_score) /
                    3,
                0
              ) / notesData.length
            )
          : 0;

      const activeStudentsCount = studentsData?.filter((s) => {
        const lastActive = new Date(s.last_active);
        const xDaysAgo = new Date();
        xDaysAgo.setDate(xDaysAgo.getDate() - 7);
        return lastActive >= xDaysAgo;
      }).length || 0;

      setStats({
        total_assignments: totalAssignments,
        completion_rate: completionRate,
        avg_score: avgScore,
        active_students: activeStudentsCount,
      });

      // Process weekly data (completions by day)
      const weekly: Record<string, number> = {};
      const dayLabels = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = dayLabels[date.getDay()];
        weekly[dayName] = 0;
      }

      assignmentsData?.forEach((assignment) => {
        const date = new Date(assignment.created_at);
        const dayName = dayLabels[date.getDay()];
        if (dayName in weekly) {
          weekly[dayName]++;
        }
      });

      setWeeklyData(
        Object.entries(weekly).map(([name, count]) => ({
          name,
          value: count,
          count,
        }))
      );

      // Process status distribution
      const statusCounts = {
        pending: assignmentsData?.filter((a) => a.status === 'pending').length || 0,
        submitted: assignmentsData?.filter((a) => a.status === 'submitted').length || 0,
        approved: assignmentsData?.filter((a) => a.status === 'approved').length || 0,
        rejected: assignmentsData?.filter((a) => a.status === 'rejected').length || 0,
      };

      setStatusData(
        Object.entries(statusCounts)
          .filter(([, count]) => count > 0)
          .map(([name, count]) => ({
            name:
              name === 'pending'
                ? 'قيد الانتظار'
                : name === 'submitted'
                  ? 'مُسلم'
                  : name === 'approved'
                    ? 'معتمد'
                    : 'مرفوض',
            value: count,
          }))
      );

      // Process student performance
      const studentPerf: StudentPerformance[] = [];
      for (const student of studentsData || []) {
        const studentAssignments = assignmentsData?.filter(
          (a) => a.student_id === student.id
        ) || [];
        const studentNotes = notesData?.filter(
          (n) => n.student_id === student.id
        ) || [];

        const assignmentsDone = studentAssignments.filter(
          (a) => a.status === 'completed'
        ).length;
        const compRate =
          studentAssignments.length > 0
            ? Math.round((assignmentsDone / studentAssignments.length) * 100)
            : 0;

        const avgNoteScore =
          studentNotes.length > 0
            ? Math.round(
                studentNotes.reduce(
                  (sum, note) =>
                    sum +
                    (note.tajweed_score +
                      note.memorization_score +
                      note.behavior_score) /
                      3,
                  0
                ) / studentNotes.length
              )
            : 0;

        studentPerf.push({
          id: student.id,
          name: student.name,
          assignments_done: assignmentsDone,
          completion_rate: compRate,
          avg_note_score: avgNoteScore,
          last_active: student.last_active || 'لم يسجل',
        });
      }

      studentPerf.sort((a, b) => b.assignments_done - a.assignments_done);
      setStudentPerformance(studentPerf);
    } catch (error) {
      console.error('خطأ في جلب بيانات التقرير:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-green-900 mb-2">التقارير والإحصائيات</h1>
          <p className="text-green-700">تتبع أداء طلابك والمقاييس الرئيسية</p>
        </div>

        {/* Date Range Selector */}
        <div className="mb-8 bg-white p-4 rounded-lg border-2 border-green-200">
          <label className="block text-sm font-semibold text-green-800 mb-3">
            نطاق التاريخ
          </label>
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="dateRange"
                value="7days"
                checked={dateRange === '7days'}
                onChange={(e) => setDateRange(e.target.value as '7days' | '30days' | 'all')}
                className="w-4 h-4"
              />
              <span className="text-green-900">آخر 7 أيام</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="dateRange"
                value="30days"
                checked={dateRange === '30days'}
                onChange={(e) => setDateRange(e.target.value as '7days' | '30days' | 'all')}
                className="w-4 h-4"
              />
              <span className="text-green-900">آخر 30 يوم</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="dateRange"
                value="all"
                checked={dateRange === 'all'}
                onChange={(e) => setDateRange(e.target.value as '7days' | '30days' | 'all')}
                className="w-4 h-4"
              />
              <span className="text-green-900">كل الوقت</span>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-green-700 text-lg">جاري تحميل البيانات...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-6 rounded-lg border-2 border-green-200 hover:border-green-400 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">إجمالي المهام</p>
                    <p className="text-3xl font-bold text-green-900">
                      {stats.total_assignments}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <TrendingUp size={24} className="text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border-2 border-green-200 hover:border-green-400 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">معدل الإكمال</p>
                    <p className="text-3xl font-bold text-green-900">
                      {stats.completion_rate}%
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Calendar size={24} className="text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border-2 border-green-200 hover:border-green-400 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">متوسط الدرجة</p>
                    <p className="text-3xl font-bold text-green-900">
                      {stats.avg_score}/5
                    </p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <TrendingUp size={24} className="text-orange-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border-2 border-green-200 hover:border-green-400 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">الطلاب النشيطون</p>
                    <p className="text-3xl font-bold text-green-900">
                      {stats.active_students}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <TrendingUp size={24} className="text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Weekly Completions Bar Chart */}
              <div className="bg-white p-6 rounded-lg border-2 border-green-200">
                <h2 className="text-lg font-bold text-green-900 mb-4">إكمالات الأسبوع</h2>
                {weeklyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#f0fdf4', border: '2px solid #059669' }}
                      />
                      <Bar dataKey="value" fill="#059669" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-72 flex items-center justify-center text-gray-500">
                    لا توجد بيانات متاحة
                  </div>
                )}
              </div>

              {/* Status Distribution Pie Chart */}
              <div className="bg-white p-6 rounded-lg border-2 border-green-200">
                <h2 className="text-lg font-bold text-green-900 mb-4">توزيع حالات المهام</h2>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-72 flex items-center justify-center text-gray-500">
                    لا توجد بيانات متاحة
                  </div>
                )}
              </div>
            </div>

            {/* Student Performance Table */}
            <div className="bg-white rounded-lg border-2 border-green-200 overflow-hidden">
              <div className="p-6 border-b-2 border-green-200">
                <h2 className="text-lg font-bold text-green-900">أداء الطلاب</h2>
              </div>

              {studentPerformance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-green-50">
                        <th className="px-6 py-3 text-right font-semibold text-green-900">
                          اسم الطالب
                        </th>
                        <th className="px-6 py-3 text-right font-semibold text-green-900">
                          المهام المكملة
                        </th>
                        <th className="px-6 py-3 text-right font-semibold text-green-900">
                          معدل الإكمال
                        </th>
                        <th className="px-6 py-3 text-right font-semibold text-green-900">
                          متوسط الدرجة
                        </th>
                        <th className="px-6 py-3 text-right font-semibold text-green-900">
                          آخر نشاط
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPerformance.map((student, idx) => (
                        <tr
                          key={student.id}
                          className={`border-b border-green-100 hover:bg-green-50 transition ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-green-50'
                          }`}
                        >
                          <td className="px-6 py-4 font-semibold text-green-900">
                            {student.name}
                          </td>
                          <td className="px-6 py-4 text-gray-700">{student.assignments_done}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-600 h-2 rounded-full transition"
                                  style={{ width: `${student.completion_rate}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-green-900">
                                {student.completion_rate}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {student.avg_note_score}/5
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {formatDate(student.last_active)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  لا توجد بيانات أداء الطلاب حتى الآن
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
