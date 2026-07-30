'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Plus, X, Users } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
}

interface Group {
  id: string;
  teacher_id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
  members?: Profile[];
  member_count?: number;
}

interface GroupMember {
  id: string;
  group_id: string;
  student_id: string;
  joined_at: string;
}

const PRESET_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500',
];

const COLOR_NAMES: Record<string, string> = {
  'bg-emerald-500': 'أخضر',
  'bg-blue-500': 'أزرق',
  'bg-purple-500': 'بنفسجي',
  'bg-pink-500': 'وردي',
  'bg-orange-500': 'برتقالي',
  'bg-teal-500': 'فيروزي',
};

const PRESET_EMOJIS = [
  '📚',
  '🕋️',
  '✨',
  '🌟',
  '🎓',
  '⭐',
  '💚',
  '🔥',
  '🎯',
  '🏆',
];

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [allStudents, setAllStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // Create Form
  const [groupName, setGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState(PRESET_EMOJIS[0]);

  // Add Member Modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedGroupForMember, setSelectedGroupForMember] = useState<string | null>(null);
  const [selectedStudentForGroup, setSelectedStudentForGroup] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchGroups();
      fetchStudents();
    }
  }, [user?.id]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch members for each group
      const groupsWithMembers = await Promise.all(
        (data || []).map(async (group) => {
          const { data: members, error: membersError } = await supabase
            .from('group_members')
            .select('id, group_id, student_id, profiles(id, name)')
            .eq('group_id', group.id);

          if (membersError) throw membersError;

          return {
            ...group,
            members: members?.map((m: any) => m.profiles) || [],
            member_count: members?.length || 0,
          };
        })
      );

      setGroups(groupsWithMembers);
    } catch (error) {
      console.error('خطأ في جلب المجموعات:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('teacher_id', user?.id)
        .eq('role', 'student');

      if (error) throw error;
      setAllStudents(data || []);
    } catch (error) {
      console.error('خطأ في جلب الطلاب:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;

    try {
      const { error } = await supabase.from('groups').insert({
        teacher_id: user?.id,
        name: groupName,
        icon: selectedEmoji,
        color: selectedColor,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      setGroupName('');
      setSelectedColor(PRESET_COLORS[0]);
      setSelectedEmoji(PRESET_EMOJIS[0]);
      setShowCreateModal(false);
      fetchGroups();
    } catch (error) {
      console.error('خطأ في إنشاء المجموعة:', error);
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroupForMember || !selectedStudentForGroup) return;

    try {
      const { error } = await supabase.from('group_members').insert({
        group_id: selectedGroupForMember,
        student_id: selectedStudentForGroup,
        joined_at: new Date().toISOString(),
      });

      if (error) throw error;

      setShowAddMemberModal(false);
      setSelectedStudentForGroup(null);
      fetchGroups();
    } catch (error) {
      console.error('خطأ في إضافة الطالب:', error);
    }
  };

  const handleRemoveMember = async (groupId: string, memberId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      fetchGroups();
    } catch (error) {
      console.error('خطأ في حذف العضو:', error);
    }
  };

  const openAddMemberModal = (groupId: string) => {
    setSelectedGroupForMember(groupId);
    setShowAddMemberModal(true);
  };

  const getUnassignedStudents = () => {
    const groupMemberIds = new Set<string>();
    groups.forEach((group) => {
      group.members?.forEach((member) => {
        groupMemberIds.add(member.id);
      });
    });

    return allStudents.filter((student) => !groupMemberIds.has(student.id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-green-900 mb-2">إدارة المجموعات</h1>
            <p className="text-green-700">نظم طلابك في مجموعات</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            <Plus size={20} />
            إنشاء مجموعة
          </button>
        </div>

        {/* Groups Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-green-700">جاري التحميل...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 bg-green-50 rounded-lg">
            <p className="text-green-700 text-lg mb-4">لا توجد مجموعات حتى الآن</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition"
            >
              <Plus size={18} />
              إنشاء أول مجموعة
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-white border-2 border-green-100 rounded-lg overflow-hidden hover:border-green-300 transition"
              >
                {/* Group Header */}
                <div
                  onClick={() =>
                    setExpandedGroupId(
                      expandedGroupId === group.id ? null : group.id
                    )
                  }
                  className={`p-4 ${group.color} text-white cursor-pointer hover:opacity-90 transition flex items-center justify-between`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{group.icon}</span>
                    <div>
                      <h3 className="font-bold text-lg">{group.name}</h3>
                      <p className="text-sm opacity-90 flex items-center gap-1">
                        <Users size={14} />
                        {group.member_count} أعضاء
                      </p>
                    </div>
                  </div>
                </div>

                {/* Group Members Avatars */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex gap-2 flex-wrap">
                    {group.members && group.members.length > 0 ? (
                      group.members.map((member) => (
                        <div
                          key={member.id}
                          title={member.name}
                          className={`w-8 h-8 ${group.color} rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:ring-2 ring-green-600 transition`}
                        >
                          {member.name.charAt(0)}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">لا يوجد أعضاء بعد</p>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedGroupId === group.id && (
                  <div className="p-4 space-y-4">
                    {/* Member List */}
                    <div>
                      <h4 className="font-bold text-green-900 mb-3">قائمة الأعضاء</h4>
                      {group.members && group.members.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {group.members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                            >
                              <span className="text-green-900">{member.name}</span>
                              <button
                                onClick={() => {
                                  const gmId = groups
                                    .find((g) => g.id === group.id)
                                    ?.members?.find(
                                      (m) => m.id === member.id
                                    );
                                  if (gmId) {
                                    // We need to find the group_members.id, not the profile.id
                                    // This requires fetching it from the database
                                    supabase
                                      .from('group_members')
                                      .select('id')
                                      .eq('group_id', group.id)
                                      .eq('student_id', member.id)
                                      .single()
                                      .then(({ data }) => {
                                        if (data) {
                                          handleRemoveMember(group.id, data.id);
                                        }
                                      });
                                  }
                                }}
                                className="text-red-600 hover:text-red-800 font-semibold text-sm"
                              >
                                حذف
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">لا يوجد أعضاء</p>
                      )}
                    </div>

                    {/* Add Member Button */}
                    <button
                      onClick={() => openAddMemberModal(group.id)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      إضافة طالب
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Group Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full" dir="rtl">
              <h2 className="text-2xl font-bold text-green-900 mb-4">إنشاء مجموعة جديدة</h2>

              <div className="space-y-4">
                {/* Group Name */}
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-1">
                    اسم المجموعة
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="مثال: المستوى الأول"
                    className="w-full px-3 py-2 border-2 border-green-200 rounded focus:outline-none focus:border-green-600"
                  />
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-2">
                    لون المجموعة
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        title={COLOR_NAMES[color]}
                        className={`w-10 h-10 ${color} rounded-lg transition transform ${
                          selectedColor === color
                            ? 'ring-4 ring-green-600 scale-110'
                            : 'hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Emoji Selection */}
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-2">
                    الأيقونة
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {PRESET_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setSelectedEmoji(emoji)}
                        className={`text-2xl p-2 rounded-lg transition ${
                          selectedEmoji === emoji
                            ? 'bg-green-100 ring-2 ring-green-600'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-2">
                    معاينة
                  </label>
                  <div className={`p-4 ${selectedColor} text-white rounded-lg flex items-center gap-3`}>
                    <span className="text-3xl">{selectedEmoji}</span>
                    <span className="font-bold">{groupName || 'اسم المجموعة'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-green-300 text-green-700 font-bold rounded hover:bg-green-50 transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCreateGroup}
                  className="flex-1 px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition disabled:opacity-50"
                  disabled={!groupName.trim()}
                >
                  إنشاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full" dir="rtl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-green-900">إضافة طالب</h2>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-green-800 mb-2">
                  اختر الطالب
                </label>
                <select
                  value={selectedStudentForGroup || ''}
                  onChange={(e) => setSelectedStudentForGroup(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-green-200 rounded focus:outline-none focus:border-green-600"
                >
                  <option value="">-- اختر طالب --</option>
                  {getUnassignedStudents().map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
                {getUnassignedStudents().length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">جميع الطلاب مضافون لمجموعات</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-green-300 text-green-700 font-bold rounded hover:bg-green-50 transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddMember}
                  className="flex-1 px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition disabled:opacity-50"
                  disabled={!selectedStudentForGroup}
                >
                  إضافة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
