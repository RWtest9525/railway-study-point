import { useEffect, useMemo, useState } from 'react';
import { Search, Shield, UserCheck, UserX, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { useTheme } from '../../contexts/ThemeContext';
import { ConfirmModal } from '../../components/ConfirmModal';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  is_premium: boolean;
  premium_until?: string | null;
  role: 'admin' | 'student' | 'banned';
  created_at: string;
}

export function UserManagement() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, isDestructive?: boolean}>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  const [passwordModal, setPasswordModal] = useState<{isOpen: boolean, user: UserProfile | null}>({ isOpen: false, user: null });
  const [manualPassword, setManualPassword] = useState('');

  useEffect(() => {
    void loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'profiles'));
      setUsers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as UserProfile)));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        user.role !== 'admin' && // Hide all admins here as requested
        `${user.full_name} ${user.email}`.toLowerCase().includes(search.toLowerCase())
      ),
    [users, search]
  );

  const updateRole = async (user: UserProfile, role: 'admin' | 'student' | 'banned') => {
    const actionLabel = role === 'admin' ? 'make admin' : role === 'banned' ? 'ban' : 'restore';
    setConfirmModal({
      isOpen: true,
      title: `${actionLabel} User`,
      message: `Are you sure you want to ${actionLabel} ${user.full_name || user.email}?`,
      isDestructive: role === 'banned',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'profiles', user.id), {
            role,
            updated_at: new Date().toISOString(),
          });
          await loadUsers();
          toast.success(`User updated: ${actionLabel}`);
        } catch (e) {
            toast.error('Failed to update role');
        }
      }
    });
  };

  const sendResetLink = async (user: UserProfile) => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success('Password reset email sent');
      setPasswordModal({ isOpen: false, user: null });
    } catch (error) {
      console.error(error);
      toast.error('Could not send reset email');
    }
  };

  const setPasswordDirectly = () => {
    // Note: Setting password directly requires Backend Firebase Admin SDK
    // which is not part of standard client-side Firebase operations.
    toast.error('Direct password overwrite requires Cloud Functions (Blaze Plan) to execute securely.');
  };

  if (loading) {
    return <div className={`py-10 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading users...</div>;
  }

  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen p-6`}>
      <div className="mb-6">
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>User Management</h1>
        <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Manage roles, access state, and password reset help from one place. Premium gifting is handled in the subscription tab.</p>
      </div>

      <label className="relative mb-6 block">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
          className={`w-full rounded-2xl border py-3 pl-11 pr-4 text-sm ${isDark ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
        />
      </label>

      <div className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} overflow-x-auto rounded-3xl border shadow-sm`}>
        <table className="min-w-full">
          <thead className={isDark ? 'bg-gray-900/70' : 'bg-gray-50'}>
            <tr>
              {['User', 'Role', 'Premium', 'Joined', 'Actions'].map((head) => (
                <th key={head} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {filteredUsers.map((user) => (
              <tr key={user.id} className={isDark ? 'hover:bg-gray-900/40' : 'hover:bg-gray-50'}>
                <td className="px-4 py-4">
                  <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.full_name || 'N/A'}</div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</div>
                </td>
                <td className="px-4 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : user.role === 'banned'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role || 'student'}
                  </span>
                </td>
                <td className={`px-4 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {user.is_premium ? `Active until ${user.premium_until ? new Date(user.premium_until).toLocaleDateString() : 'lifetime'}` : 'Free'}
                </td>
                <td className={`px-4 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button onClick={() => { setPasswordModal({ isOpen: true, user }); setManualPassword(''); }} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                      <KeyRound className="h-3.5 w-3.5" />
                      Manage Password
                    </button>
                    {user.role !== 'admin' && (
                      <button onClick={() => void updateRole(user, 'admin')} className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700">
                        <Shield className="h-3.5 w-3.5" />
                        Make admin
                      </button>
                    )}
                    {user.role !== 'banned' && user.role !== 'admin' && (
                      <button onClick={() => void updateRole(user, 'banned')} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                        <UserX className="h-3.5 w-3.5" />
                        Ban
                      </button>
                    )}
                    {user.role === 'banned' && (
                      <button onClick={() => void updateRole(user, 'student')} className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                        <UserCheck className="h-3.5 w-3.5" />
                        Restore
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />

      {passwordModal.isOpen && passwordModal.user && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity">
          <div className={`w-full max-w-md overflow-hidden rounded-[24px] border ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'} shadow-2xl`}>
            <div className="p-6">
              <h3 className={`mb-2 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Manage Password</h3>
              <p className={`mb-6 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Managing password for <strong>{passwordModal.user.email}</strong>.
              </p>

              <div className="space-y-4">
                <button
                  onClick={() => void sendResetLink(passwordModal.user!)}
                  className="w-full rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Send Reset Link Email
                </button>

                <div className="relative flex items-center py-2">
                  <div className={`flex-grow border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}></div>
                  <span className={`mx-4 flex-shrink-0 text-xs text-slate-400`}>OR MANUAL ENFORCEMENT</span>
                  <div className={`flex-grow border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}></div>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Type new password"
                    value={manualPassword}
                    onChange={(e) => setManualPassword(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'}`}
                  />
                  <button
                    onClick={setPasswordDirectly}
                    className={`w-full rounded-2xl border px-5 py-3 text-sm font-semibold ${isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-500' : 'border-amber-200 bg-amber-50 text-amber-700'}`}
                  >
                    Force Change Password
                  </button>
                  <p className="text-center text-xs text-slate-500">
                    *Requires Cloud Functions to directly change passwords of other users.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPasswordModal({ isOpen: false, user: null })}
                className={`mt-6 w-full rounded-2xl border px-5 py-3 text-sm font-semibold ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-50 text-slate-700'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
