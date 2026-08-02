'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Search, Star, Zap, Calendar, Plus, Bell, Check, X, UserPlus } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  level: number;
  xp: number;
  streak_days: number;
  teacher_id: string;
}

interface StudentDetails extends Profile {
  assignments_completed: number;
  assignments_total: number;
  recent_notes: any[];
  rating?: number;
}

interface TeacherRequest {
  id: string;
  student_id: string;
  student_name: string;
  status: string;
  created_at: string;
}

interface NoteRecord {
  tajweed_score: number;
  memorization_score: number;
  behavior_score: number;
  note: string;
}

interface Achievement {
  title: string;
  description: string;
  badge_icon: string;
}

const PRESET_ACHIEVEMENTS: Achievement[] = [
  { title: 'حافظ', description: 'أكمل حفظ القرآن الكريم', badge_icon: '🕋️' },
  { title: 'مجود', description: 'إتقان التجويد', badge_icon: '✨' },
  { title: 'مثابر', description: 'استمرار مميز في الدراسة', badge_icon: '🔥' },
  { title: 'متفوق', description: 'أداء استثنائي', badge_icon: '⭐' },
  { title: 'معلم صغير', description: 'ساعد زملاء آخرين', badge_icon: '👨‍🎓' },
];

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentDetails[]>([]);
  const [pendingRequests, setPendingRequests] = useState<TeacherRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);

  // Modals
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Form states
  const [noteForm, setNoteForm] = useState<NoteRecord>({
    tajweed_score: 3,
    memorization_score: 3,
    behavior_score: 3,
    note: '',
  });
  const [selectedAchievement, setSelectedAchievement] = useState(0);
  const [notificationMsg, setNotificationMsg] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchStudents();
      fetchPendingRequests();
    }
  }, [user?.id]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('xp', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('خطأ في جلب الطلاب:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      setRequestsLoading(true);
      const { data, error } = await supabase
        .from('teacher_requests')
        .select('*')
        .eq('teacher_id', user?.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (error) {
      console.error('خطأ في جلب الطلبات:', error);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string, studentId: string) => {
    try {
      // Update request status
      const { error: reqError } = await supabase
        .from('teacher_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (reqError) throw reqError;

      // Update student's teacher_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ teacher_id: user?.id })
        .eq('id', studentId);

      if (profileError) throw profileError;

      // Send notification to student
      await supabase.from('notifications').insert({
        user_id: studentId,
        title: 'تم قبول طلبك',
        content: 'لقد تم قبول طلبك للانضمام إلى مجموعة المعلم. يمكنك الآن البدء في التعلم!',
        type: 'student_join_request',
        read: false,
        created_at: new Date().toISOString(),
      });

      fetchPendingRequests();
      fetchStudents();
    } catch (error) {
      console.error('خطأ في قبول الطلب:', error);
    }
  };

  const handleRejectRequest = async (requestId: string, studentId: string) => {
    try {
      const { error } = await supabase
        .from('teacher_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      // Send notification to student
      await supabase.from('notifications').insert({
        user_id: studentId,
        title: 'تم رفض طلبك',
        content: 'لم يتم قبول طلبك للانضمام إلى مجموعة المعلم. يمكنك البحث عن معلم آخر.',
        type: 'student_join_request',
        read: false,
        created_at: new Date().toISOString(),
      });

      fetchPendingRequests();
    } catch (error) {
      console.error('خطأ في رفض الطلب:', error);
    }
  };

  const handleAddNote = async () => {
    if (!selectedStudentId) return;
    try {
      const { error } = await supabase.from('notes_records').insert({
        teacher_id: user?.id,
        student_id: selectedStudentId,
        tajweed_score: noteForm.tajweed_score,
        memorization_score: noteForm.memorization_score,
        behavior_score: noteForm.behavior_score,
        note: noteForm.note,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
      setShowNoteModal(false);
      setNoteForm({
        tajweed_score: 3,
        memorization_score: 3,
        behavior_score: 3,
        note: '',
      });
      fetchStudents();
    } catch (error) {
      console.error('خطأ في إضافة الملاحظة:', error);
    }
  };

  const handleGrantAchievement = async () => {
    if (!selectedStudentId) return;
    try {
      const achievement = PRESET_ACHIEVEMENTS[selectedAchievement];
      const { error } = await supabase.from('achievements').insert({
        student_id: selectedStudentId,
        title: achievement.title,
        description: achievement.description,
        badge_icon: achievement.badge_icon,
        earned: true,
        earned_at: new Date().toISOString(),
      });

      if (error) throw error;
      setShowAchievementModal(false);
      fetchStudents();
    } catch (error) {
      console.error('خطأ في منح الإنجاز:', error);
    }
  };

  const handleSendNotification = async () => {
    if (!selectedStudentId || !notificationMsg) return;
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: selectedStudentId,
        title: 'رسالة من المعلم',
        content: notificationMsg,
        type: 'teacher_message',
        read: false,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
      setShowNotificationModal(false);
      setNotificationMsg('');
    } catch (error) {
      console.error('خطأ في إرسال الإشعار:', error);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.name.includes(searchQuery)
  );

  const openNoteModal = (studentId: string) => {
    setSelectedStudentId(studentId);
    setShowNoteModal(true);
  };

  const openAchievementModal = (studentId: string) => {
    setSelectedStudentId(studentId);
    setShowAchievementModal(true);
  };

  const openNotificationModal = (studentId: string) => {
    setSelectedStudentId(studentId);
    setShowNotificationModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-green-900 mb-2">إدارة الطلاب</h1>
          <p className="text-green-700">تابع تطور طلابك وقيم أدائهم</p>
        </div>

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <div className="mb-8 bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-amber-800">طلبات انضمام بانتظار القبول</h2>
              <span className="bg-amber-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            </div>
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between bg-white p-4 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                      {req.student_name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-amber-900">{req.student_name}</div>
                      <div className="text-sm text-amber-700">يريد الانضمام إلى مجموعتك</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAcceptRequest(req.id, req.student_id)}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                      <Check className="w-4 h-4" />
                      قبول
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req.id, req.student_id)}
                      className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                      <X className="w-4 h-4" />
                      رفض
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute right-4 top-3 text-green-600" size={20} />
            <input
              type="text"
              placeholder="ابحث عن طالب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-12 pl-4 py-3 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition"
            />
          </div>
        </div>

        {/* Students List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-green-700">جاري التحميل...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 bg-green-50 rounded-lg">
            <p className="text-green-700 text-lg">لا يوجد طلاب مرتبطون بك حالياً</p>
            <p className="text-green-600 text-sm mt-2">سيتم عرض الطلاب هنا عندما ينضمون لمجموعتك</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredStudents.map((student) => (
              <div key={student.id} className="bg-white border-2 border-green-100 rounded-lg overflow-hidden hover:border-green-300 transition">
                {/* Main Student Card */}
                <div
                  onClick={() =>
                    setExpandedStudentId(
                      expandedStudentId === student.id ? null : student.id
                    )
                  }
                  className="p-4 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {student.name.charAt(0)}
                    </div>

                    {/* Student Info */}
                    <div className="flex-1">
                      <h3 className="font-bold text-green-900 text-lg">{student.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">
                          المستوى {student.level}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6 text-center">
                      <div>
                        <div className="flex items-center gap-1 text-green-600 font-bold">
                          <Zap size={16} />
                          <span>{student.xp}</span>
                        </div>
                        <span className="text-xs text-gray-600">نقاط</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-orange-600 font-bold">
                          <Calendar size={16} />
                          <span>{student.streak_days}</span>
                        </div>
                        <span className="text-xs text-gray-600">يوم متتالي</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedStudentId === student.id && (
                  <div className="border-t-2 border-green-100 p-4 bg-green-50">
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="font-bold text-green-900 mb-2">تقدم المهام</h4>
                        <div className="bg-white p-3 rounded border border-green-200">
                          <p className="text-green-700">
                            {student.assignments_completed} / {student.assignments_total} مكتملة
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition"
                              style={{
                                width: `${
                                  student.assignments_total > 0
                                    ? (student.assignments_completed / student.assignments_total) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-green-900 mb-2">آخر ملاحظات</h4>
                        <div className="bg-white p-3 rounded border border-green-200 max-h-24 overflow-y-auto">
                          {student.recent_notes?.length > 0 ? (
                            <ul className="text-sm text-green-700 space-y-1">
                              {student.recent_notes.map((note, idx) => (
                                <li key={idx}>• {note}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-500 text-sm">لا توجد ملاحظات</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => openNoteModal(student.id)}
                        className="flex-1 min-w-max bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition"
                      >
                        إضافة ملاحظة
                      </button>
                      <button
                        onClick={() => openAchievementModal(student.id)}
                        className="flex-1 min-w-max bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
                      >
                        منح إنجاز
                      </button>
                      <button
                        onClick={() => openNotificationModal(student.id)}
                        className="flex-1 min-w-max bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded transition flex items-center justify-center gap-2"
                      >
                        <Bell size={16} />
                        إرسال إشعار
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Note Modal */}
        {showNoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full" dir="rtl">
              <h2 className="text-2xl font-bold text-green-900 mb-4">إضافة ملاحظة</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-1">
                    درجة التجويد (1-5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={noteForm.tajweed_score}
                    onChange={(e) =>
                      setNoteForm({ ...noteForm, tajweed_score: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border-2 border-green-200 rounded focus:outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-1">
                    درجة الحفظ (1-5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={noteForm.memorization_score}
                    onChange={(e) =>
                      setNoteForm({ ...noteForm, memorization_score: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border-2 border-green-200 rounded focus:outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-1">
                    درجة السلوك (1-5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={noteForm.behavior_score}
                    onChange={(e) =>
                      setNoteForm({ ...noteForm, behavior_score: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border-2 border-green-200 rounded focus:outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-1">
                    الملاحظة
                  </label>
                  <textarea
                    value={noteForm.note}
                    onChange={(e) =>
                      setNoteForm({ ...noteForm, note: e.target.value })
                    }
                    placeholder="أضف ملاحظاتك..."
                    className="w-full px-3 py-2 border-2 border-green-200 rounded focus:outline-none focus:border-green-600 h-24 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-green-300 text-green-700 font-bold rounded hover:bg-green-50 transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddNote}
                  className="flex-1 px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition"
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Achievement Modal */}
        {showAchievementModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full" dir="rtl">
              <h2 className="text-2xl font-bold text-green-900 mb-4">منح إنجاز</h2>

              <div className="space-y-3 mb-6">
                {PRESET_ACHIEVEMENTS.map((achievement, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center p-3 border-2 rounded cursor-pointer transition ${
                      selectedAchievement === idx
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="achievement"
                      checked={selectedAchievement === idx}
                      onChange={() => setSelectedAchievement(idx)}
                      className="ml-3"
                    />
                    <div>
                      <span className="text-2xl ml-2">{achievement.badge_icon}</span>
                      <div>
                        <p className="font-bold text-green-900">{achievement.title}</p>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowAchievementModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-green-300 text-green-700 font-bold rounded hover:bg-green-50 transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleGrantAchievement}
                  className="flex-1 px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition"
                >
                  منح
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notification Modal */}
        {showNotificationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full" dir="rtl">
              <h2 className="text-2xl font-bold text-green-900 mb-4">إرسال إشعار</h2>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-green-800 mb-2">
                  الرسالة
                </label>
                <textarea
                  value={notificationMsg}
                  onChange={(e) => setNotificationMsg(e.target.value)}
                  placeholder="اكتب رسالتك..."
                  className="w-full px-3 py-2 border-2 border-green-200 rounded focus:outline-none focus:border-green-600 h-24 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-green-300 text-green-700 font-bold rounded hover:bg-green-50 transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSendNotification}
                  className="flex-1 px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition"
                >
                  إرسال
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
