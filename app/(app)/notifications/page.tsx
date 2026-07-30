'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { ClipboardList, Trophy, FileText, Bell, UserPlus, Check, CheckCheck, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

type NotificationType = 'assignment' | 'achievement' | 'note' | 'general' | 'student_join_request'

interface Notification {
  id: string
  title: string
  body: string
  type: NotificationType
  read: boolean
  created_at: string
  user_id: string
}

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; bg: string; label: string }> = {
  assignment: {
    icon: ClipboardList,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    label: 'مهمة',
  },
  achievement: {
    icon: Trophy,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    label: 'إنجاز',
  },
  note: {
    icon: FileText,
    color: 'text-green-600',
    bg: 'bg-green-50',
    label: 'ملاحظة',
  },
  general: {
    icon: Bell,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    label: 'عام',
  },
  student_join_request: {
    icon: UserPlus,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    label: 'طلب انضمام',
  },
}

export default function NotificationsPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [pageLoading, setPageLoading] = useState(true)
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null)
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false)

  useEffect(() => {
    if (!loading && !profile) {
      router.replace('/login')
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (profile) {
      loadNotifications()
    }
  }, [profile])

  async function loadNotifications() {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setNotifications(data as Notification[])
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setPageLoading(false)
    }
  }

  async function handleMarkAsRead(notificationId: string) {
    try {
      setMarkingAsRead(notificationId)

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (!error) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        )
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    } finally {
      setMarkingAsRead(null)
    }
  }

  async function handleMarkAllAsRead() {
    try {
      setMarkingAllAsRead(true)

      const unreadIds = notifications
        .filter(n => !n.read)
        .map(n => n.id)

      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)

      if (!error) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true }))
        )
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    } finally {
      setMarkingAllAsRead(false)
    }
  }

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-emerald-600 font-cairo">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => !n.read)

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-12">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-emerald-800 font-cairo flex items-center gap-2">
                <Bell className="w-8 h-8 text-emerald-600" />
                الإشعارات
              </h1>
              {unreadCount > 0 && (
                <p className="text-emerald-600 font-cairo mt-1">
                  لديك {unreadCount} إشعار جديد
                </p>
              )}
            </div>

            {/* Mark all as read button */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingAllAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-cairo font-semibold text-sm disabled:opacity-50"
              >
                {markingAllAsRead ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4" />
                )}
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-3 border-b-2 border-emerald-200">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 font-cairo font-semibold transition-colors border-b-2 ${
                filter === 'all'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 font-cairo font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                filter === 'unread'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              غير مقروء
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-emerald-200">
            <Bell className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
            <p className="text-emerald-600 font-cairo text-lg">
              {filter === 'unread' ? 'لا توجد إشعارات جديدة' : 'لا توجد إشعارات'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map(notification => {
              const config = typeConfig[notification.type as NotificationType]
              const Icon = config.icon
              const isUnread = !notification.read
              const relativeTime = formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: ar,
              })

              return (
                <div
                  key={notification.id}
                  className={`rounded-2xl p-4 transition-all border-2 cursor-pointer ${
                    isUnread
                      ? `${config.bg} border-2 border-emerald-300 shadow-md`
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    if (isUnread) {
                      handleMarkAsRead(notification.id)
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 flex-none ${config.bg}`}>
                      <Icon className={`w-6 h-6 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className={`font-semibold font-cairo mb-1 ${
                            isUnread ? 'text-gray-800' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h3>
                          <p className={`text-sm line-clamp-2 font-cairo ${
                            isUnread ? 'text-gray-700' : 'text-gray-600'
                          }`}>
                            {notification.body}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500 font-cairo">
                              {relativeTime}
                            </span>
                            <span className={`inline-block px-2 py-1 text-xs rounded-full font-cairo font-semibold ${config.bg} ${config.color}`}>
                              {config.label}
                            </span>
                          </div>
                        </div>

                        {/* Unread Badge / Read Button */}
                        {isUnread ? (
                          <div className="w-3 h-3 rounded-full bg-emerald-600 shrink-0 mt-2" />
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAsRead(notification.id)
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 p-1"
                            title="تحديد كمقروء"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Loading indicator */}
                    {markingAsRead === notification.id && (
                      <div className="ml-2">
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer info */}
        {notifications.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-600 font-cairo">
            إجمالي الإشعارات: {notifications.length}
          </div>
        )}
      </div>
    </div>
  )
}
