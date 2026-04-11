import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCheck, Sparkles, Zap } from 'lucide-react';
import { useRouter } from '../contexts/RouterContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getUserNotifications, markNotificationRead, Notification, timestampToString } from '../lib/firestore';
import { ConfirmModal } from '../components/ConfirmModal';
import toast from 'react-hot-toast';

export function Notifications() {
  const { navigate, goBack } = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
    toast.success('All marked as read');
  };

  const handleMarkAllClick = () => {
    if (unreadCount === 0) {
      toast('You have already read all notifications', {
        duration: 3000,
        icon: '✅'
      });
      return;
    }
    setConfirmOpen(true);
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
            <button onClick={() => goBack()} className={`rounded-[18px] p-2.5 transition ${isDark ? 'hover:bg-gray-800 bg-gray-900/50' : 'hover:bg-slate-100 bg-white shadow-sm'}`}>
              <ArrowLeft className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`} />
            </button>
            <div>
              <h1 className={`text-xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Notifications</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/notifications/push')}
              className={`rounded-[18px] px-4 py-2.5 text-xs font-bold tracking-wide transition shadow-sm ${isDark ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-white border text-slate-700 hover:bg-slate-50'}`}
            >
              Push Alert
            </button>
            <button
              onClick={handleMarkAllClick}
              className={`flex h-10 w-10 items-center justify-center rounded-[18px] transition ${
                unreadCount === 0
                  ? isDark
                    ? 'bg-gray-800 text-gray-600'
                    : 'bg-slate-100 text-slate-400'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:scale-105'
              }`}
            >
              <CheckCheck className="h-5 w-5" />
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
                className={`group w-full rounded-[24px] border p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                  isDark
                    ? notification.is_read
                      ? 'border-gray-800/60 bg-gray-900/40 hover:border-gray-700'
                      : 'border-blue-500/30 bg-gradient-to-br from-blue-900/20 to-indigo-900/10 hover:border-blue-500/50'
                    : notification.is_read
                    ? 'border-slate-100 bg-white/50 hover:bg-white'
                    : 'border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30'
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

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          markAllAsRead();
          setConfirmOpen(false);
        }}
        title="Mark All as Read?"
        message="Are you sure you want to mark all unread notifications as read?"
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
