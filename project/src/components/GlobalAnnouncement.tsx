import { useEffect, useMemo, useState } from 'react';
import { Bell, Megaphone, Pencil, Search, Send, Trash2, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { createNotifications, getUsers, UserProfile } from '../lib/firestore';
import { formatDateTime } from '../lib/dateUtils';

interface NotificationGroup {
  id: string;
  title: string;
  message: string;
  audience: 'global' | 'selected';
  count: number;
  createdAt: string;
}

export function GlobalAnnouncement() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const isDark = theme === 'dark';
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [history, setHistory] = useState<NotificationGroup[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    audience: 'global' as 'global' | 'selected',
    title: '',
    message: '',
  });

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profiles, notificationsSnapshot] = await Promise.all([
        getUsers(),
        getDocs(query(collection(db, 'notifications'), orderBy('created_at', 'desc'))),
      ]);

      setUsers(profiles);

      const notifications = notificationsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as any));
      const grouped = new Map<string, NotificationGroup>();

      notifications.forEach((item) => {
        const groupId = item.notification_group_id || item.id;
        if (!grouped.has(groupId)) {
          grouped.set(groupId, {
            id: groupId,
            title: item.title,
            message: item.message,
            audience: item.audience || 'selected',
            count: 0,
            createdAt: item.created_at?.toDate ? item.created_at.toDate().toISOString() : item.created_at || new Date().toISOString(),
          });
        }
        grouped.get(groupId)!.count += 1;
      });

      setHistory(
        Array.from(grouped.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    } catch (error) {
      console.error(error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return users
      .filter((user) => `${user.full_name} ${user.email} ${user.phone || ''}`.toLowerCase().includes(q))
      .filter((user) => !selectedUsers.some((item) => item.id === user.id))
      .slice(0, 8);
  }, [users, search, selectedUsers]);

  const resetForm = () => {
    setEditingGroupId(null);
    setSelectedUsers([]);
    setSearch('');
    setFormData({
      audience: 'global',
      title: '',
      message: '',
    });
  };

  const handleSend = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Enter title and message');
      return;
    }

    const targets =
      formData.audience === 'global'
        ? users
        : selectedUsers;

    if (targets.length === 0) {
      toast.error('Choose at least one user');
      return;
    }

    setSending(true);
    const groupId = editingGroupId || `notification_${Date.now()}`;

    try {
      if (editingGroupId) {
        const snapshot = await getDocs(query(collection(db, 'notifications'), where('notification_group_id', '==', editingGroupId)));
        await Promise.all(
          snapshot.docs.map((item) =>
            updateDoc(doc(db, 'notifications', item.id), {
              title: formData.title.trim(),
              message: formData.message.trim(),
              updated_at: new Date().toISOString(),
            })
          )
        );
        toast.success('Notification updated');
      } else {
        await createNotifications(
          targets.map((user) => ({
            user_id: user.id,
            notification_group_id: groupId,
            audience: formData.audience,
            recipient_name: user.full_name,
            sent_by: profile?.id,
            title: formData.title.trim(),
            message: formData.message.trim(),
            type: 'system',
            is_read: false,
            is_push: false,
            action_url: '/notifications',
          }))
        );
        toast.success('Notification sent');
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save notification');
    } finally {
      setSending(false);
    }
  };

  const handleEdit = async (group: NotificationGroup) => {
    setEditingGroupId(group.id);
    setFormData({
      audience: group.audience,
      title: group.title,
      message: group.message,
    });

    if (group.audience === 'selected') {
      const snapshot = await getDocs(query(collection(db, 'notifications'), where('notification_group_id', '==', group.id)));
      const userIds = new Set(snapshot.docs.map((item) => item.data().user_id));
      setSelectedUsers(users.filter((user) => userIds.has(user.id)));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Delete this notification from all user panels?')) return;
    try {
      const snapshot = await getDocs(query(collection(db, 'notifications'), where('notification_group_id', '==', groupId)));
      await Promise.all(snapshot.docs.map((item) => deleteDoc(doc(db, 'notifications', item.id))));
      toast.success('Notification deleted');
      if (editingGroupId === groupId) {
        resetForm();
      }
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete notification');
    }
  };

  return (
    <div className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} rounded-3xl border p-6 shadow-sm`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? 'bg-orange-500/15 text-orange-300' : 'bg-orange-50 text-orange-600'}`}>
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Send global or selected notifications. Push notification is coming soon.
            </p>
          </div>
        </div>
        <button
          type="button"
          className={`rounded-2xl px-4 py-2 text-xs font-semibold ${isDark ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
        >
          Push Coming Soon
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: 'global' as const, title: 'Global', subtitle: 'Send to all current users' },
              { id: 'selected' as const, title: 'Selected Users', subtitle: 'Choose by name, email, or phone' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, audience: item.id }))}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  formData.audience === item.id
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : isDark
                    ? 'border-gray-700 bg-gray-900 text-gray-300'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
              >
                <div className="text-sm font-semibold">{item.title}</div>
                <div className={`mt-1 text-xs ${formData.audience === item.id ? 'text-blue-500' : isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {item.subtitle}
                </div>
              </button>
            ))}
          </div>

          {formData.audience === 'selected' && (
            <div className={`rounded-3xl border p-4 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
              <label className="relative block">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or phone"
                  className={`w-full rounded-2xl border py-3 pl-11 pr-4 text-sm ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-200 bg-white text-gray-900'}`}
                />
              </label>

              {selectedUsers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <span key={user.id} className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-blue-500/15 text-blue-200' : 'bg-blue-50 text-blue-700'}`}>
                      {user.full_name || user.email}
                      <button type="button" onClick={() => setSelectedUsers((prev) => prev.filter((item) => item.id !== user.id))}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {search && filteredUsers.length > 0 && (
                <div className={`mt-3 rounded-2xl border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedUsers((prev) => [...prev, user]);
                        setSearch('');
                      }}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm ${isDark ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <div>
                        <div className="font-semibold">{user.full_name || 'Unknown User'}</div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}{user.phone ? ` • ${user.phone}` : ''}</div>
                      </div>
                      <UserPlus className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4">
            <label className="block">
              <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Title</span>
              <input
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'}`}
                placeholder="Enter notification title"
              />
            </label>
            <label className="block">
              <span className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Content</span>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                rows={4}
                className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'}`}
                placeholder="Type the notification content"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Saving...' : editingGroupId ? 'Update Notification' : 'Send Notification'}
            </button>
            {(editingGroupId || selectedUsers.length > 0 || formData.title || formData.message) && (
              <button
                type="button"
                onClick={resetForm}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className={`rounded-3xl border p-4 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notification History</h4>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Latest notifications on top</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'}`}>
              {history.length}
            </span>
          </div>

          {loading ? (
            <div className={`py-8 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</div>
          ) : history.length === 0 ? (
            <div className={`rounded-2xl border border-dashed px-4 py-8 text-center text-sm ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-300 text-gray-500'}`}>
              No notifications sent yet
            </div>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 8).map((item, index) => (
                <div key={item.id} className={`rounded-2xl border p-4 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`truncate text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</div>
                        {index === 0 && (
                          <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                            NEW
                          </span>
                        )}
                      </div>
                      <div className={`mt-1 line-clamp-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.message}</div>
                      <div className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        {item.audience === 'global' ? 'Global' : `${item.count} selected users`} • {formatDateTime(item.createdAt)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void handleEdit(item)} className={`rounded-xl p-2 ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => void handleDelete(item.id)} className="rounded-xl bg-red-50 p-2 text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={`mt-4 rounded-2xl px-4 py-3 text-xs ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
            The bell in the user panel reads from this same notification history.
          </div>
        </div>
      </div>
    </div>
  );
}
