import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCheck, Sparkles, Zap } from 'lucide-react';
import { useRouter } from '../contexts/RouterContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getUserNotifications, markNotificationRead, Notification, timestampToString } from '../lib/firestore';

export function Notifications() {
  const { navigate, goBack } = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadNotifications();
  }, [user?.uid]);

  const loadNotifications = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getUserNotifications(user.uid);
      setNotifications(
        data.map((item) => ({
          ...item,
          created_at: timestampToString(item.created_at as any),
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);

  const markAllAsRead = async () => {
    const unread = notifications.filter((item) => !item.is_read);
    await Promise.all(unread.map((item) => markNotificationRead(item.id)));
    await loadNotifications();
  };

  const handleOpen = async (notification: Notification) => {
    if (!notification.is_read) {
      await markNotificationRead(notification.id);
      setNotifications((prev) => prev.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)));
    }

    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-gray-900' : 'bg-[#f5f7fb]'}`}>
      <header className={`${isDark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-slate-200'} sticky top-0 z-50 border-b backdrop-blur-md`}>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => goBack()} className={`rounded-full p-2 ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
              <ArrowLeft className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
            </button>
            <div>
              <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h1>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Latest messages from admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/notifications/push')}
              className={`rounded-2xl px-3 py-2 text-xs font-semibold ${isDark ? 'bg-gray-800 text-gray-200' : 'bg-slate-100 text-slate-700'}`}
            >
              Push Alert
            </button>
            <button
              onClick={() => void markAllAsRead()}
              disabled={unreadCount === 0}
              className={`rounded-2xl px-3 py-2 text-xs font-semibold ${
                unreadCount === 0
                  ? isDark
                    ? 'bg-gray-800 text-gray-500'
                    : 'bg-slate-100 text-slate-400'
                  : 'bg-blue-600 text-white'
              }`}
            >
              Mark all read
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {loading ? (
          <div className={`py-10 text-center text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className={`rounded-[28px] border p-8 text-center ${isDark ? 'border-gray-700 bg-gray-800' : 'border-slate-200 bg-white shadow-sm'}`}>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>No notifications yet</h2>
            <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>When admin sends updates, they will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification, index) => (
              <button
                key={notification.id}
                onClick={() => void handleOpen(notification)}
                className={`w-full rounded-[28px] border p-5 text-left transition ${
                  isDark
                    ? notification.is_read
                      ? 'border-gray-700 bg-gray-800'
                      : 'border-blue-500/40 bg-blue-500/10'
                    : notification.is_read
                    ? 'border-slate-200 bg-white shadow-sm'
                    : 'border-blue-200 bg-blue-50 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`truncate text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{notification.title}</h3>
                      {!notification.is_read && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                          NEW
                        </span>
                      )}
                      {index === 0 && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                          Latest
                        </span>
                      )}
                    </div>
                    <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>{notification.message}</p>
                    <div className={`mt-3 flex flex-wrap items-center gap-3 text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        Admin Update
                      </span>
                      <span>{new Date(notification.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${notification.is_read ? (isDark ? 'bg-gray-900 text-gray-400' : 'bg-slate-100 text-slate-500') : 'bg-blue-600 text-white'}`}>
                    {notification.is_read ? <CheckCheck className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
