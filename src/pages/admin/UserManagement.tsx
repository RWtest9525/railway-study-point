import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  UserPlus, 
  Search, 
  Trash2, 
  Ban, 
  ShieldCheck, 
  Mail, 
  KeyRound, 
  UserMinus, 
  ShieldAlert,
  Crown,
  Filter,
  Clock,
  Calendar
} from 'lucide-react';
import { isSuperAdminEmail } from '../../lib/authUtils';

type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'admin' | 'student' | 'banned';
  is_premium: boolean;
  premium_until: string | null;
  created_at: string;
};

export function UserManagement() {
  const { profile: currentAdmin } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [premiumFilter, setPremiumFilter] = useState<'all' | 'premium' | 'free'>('all');
  const [loading, setLoading] = useState<string | boolean>(false);
  const [listLoading, setListLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setListLoading(true);
    try {
      const { data, error: qErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (qErr) throw qErr;
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setListLoading(false);
    }
  };

  const promote = async (userId: string, email: string) => {
    if (isSuperAdminEmail(email)) return;
    setLoading(userId);
    setError('');
    setMessage('');
    try {
      const { error: uErr } = await supabase
        .from('profiles')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (uErr) throw uErr;
      setMessage(`Admin access granted.`);
      loadUsers();
    } catch (err) {
      console.error(err);
      setError('Could not update role.');
    } finally {
      setLoading(false);
    }
  };

  const demote = async (userId: string, email: string) => {
    if (isSuperAdminEmail(email)) return;
    if (userId === currentAdmin?.id) {
      alert('You cannot demote yourself.');
      return;
    }
    if (!confirm('Are you sure you want to demote this admin to a student?')) return;

    setLoading(userId);
    setError('');
    setMessage('');
    try {
      const { error: uErr } = await supabase
        .from('profiles')
        .update({ role: 'student', updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (uErr) throw uErr;
      setMessage(`Admin demoted to student.`);
      loadUsers();
    } catch (err) {
      console.error(err);
      setError('Could not update role.');
    } finally {
      setLoading(false);
    }
  };

  const banUser = async (userId: string, email: string, isCurrentlyBanned: boolean) => {
    if (isSuperAdminEmail(email)) {
      alert('Super Admins cannot be banned.');
      return;
    }
    if (userId === currentAdmin?.id) {
      alert('You cannot ban yourself.');
      return;
    }
    const newRole = isCurrentlyBanned ? 'student' : 'banned';
    if (!confirm(`Are you sure you want to ${isCurrentlyBanned ? 'Unban' : 'Ban'} this user?`)) return;
    
    setLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      setMessage(isCurrentlyBanned ? 'User unbanned.' : 'User banned.');
      loadUsers();
    } catch (err) {
      console.error(err);
      setError('Action failed.');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (isSuperAdminEmail(email)) {
      alert('Super Admins cannot be deleted.');
      return;
    }
    if (userId === currentAdmin?.id) {
      alert('You cannot delete your own profile.');
      return;
    }
    if (!confirm('CRITICAL: Are you sure you want to DELETE this user? This will remove their profile and results.')) return;
    
    setLoading(userId);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      setMessage('User profile deleted.');
      loadUsers();
    } catch (err) {
      console.error(err);
      setError('Delete failed.');
    } finally {
      setLoading(false);
    }
  };

  const sendResetPassword = async (userEmail: string) => {
    if (!confirm(`Send password reset link to ${userEmail}?`)) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage('Reset link sent to user email.');
    } catch (err) {
      console.error(err);
      setError('Failed to send reset link.');
    }
  };

  const togglePremium = async (userId: string, currentStatus: boolean) => {
    setLoading(userId);
    setError('');
    setMessage('');
    try {
      const updates: any = {
        is_premium: !currentStatus,
        updated_at: new Date().toISOString()
      };

      if (!currentStatus) {
        // Enabling premium - set expiry to 30 days from now
        updates.premium_until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        // Disabling premium - clear expiry
        updates.premium_until = null;
      }

      const { error: uErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      
      if (uErr) throw uErr;
      setMessage(`Premium status ${!currentStatus ? 'granted for 30 days' : 'revoked'}.`);
      loadUsers();
    } catch (err) {
      console.error(err);
      setError('Could not update premium status.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isPremium = u.is_premium && u.premium_until && new Date(u.premium_until) > new Date();
    const matchesPremium = premiumFilter === 'all' || 
      (premiumFilter === 'premium' && isPremium) || 
      (premiumFilter === 'free' && !isPremium);

    return matchesSearch && matchesPremium;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-blue-400" />
            User Management
          </h2>
          <p className="text-gray-400 text-sm mt-1">Manage permissions, subscriptions, and account security</p>
        </div>
      </div>

      {message && (
        <div className="bg-green-900/40 border border-green-600 text-green-200 px-4 py-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-900/40 border border-red-600 text-red-200 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-6 border-b border-gray-700 bg-gray-700/30 flex flex-col lg:flex-row items-center gap-4">
          <div className="relative w-full lg:flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 text-white pl-12 pr-4 py-3 rounded-xl border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <Filter className="w-5 h-5 text-gray-400 shrink-0" />
            <div className="flex bg-gray-800 rounded-xl p-1 border border-gray-600 w-full lg:w-auto">
              {(['all', 'premium', 'free'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setPremiumFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    premiumFilter === f 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest hidden lg:table-cell">Subscription</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">Joined At</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role/Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {listLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isPremium = u.is_premium && u.premium_until && new Date(u.premium_until) > new Date();
                  return (
                    <tr key={u.id} className="hover:bg-gray-700/30 transition group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">{u.full_name || 'Student'}</span>
                            {isSuperAdminEmail(u.email) && (
                              <span className="bg-amber-500/20 text-amber-500 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                                <ShieldAlert className="w-2 h-2" /> Super Admin
                              </span>
                            )}
                            {u.id === currentAdmin?.id && (
                              <span className="bg-blue-500/20 text-blue-400 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-blue-500/20">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-gray-500 text-xs flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {u.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        {isPremium ? (
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5 text-yellow-500 font-bold text-xs uppercase tracking-wider">
                              <Crown className="w-3.5 h-3.5" />
                              Premium Active
                            </span>
                            <span className="text-gray-500 text-[10px] flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              Ends: {new Date(u.premium_until!).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-600 text-xs font-medium italic">Free Plan</span>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="flex flex-col text-gray-400 text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-500" />
                            {new Date(u.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1 mt-0.5 text-gray-600">
                            <Clock className="w-3 h-3 text-gray-700" />
                            {new Date(u.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border w-fit ${
                            u.role === 'admin' ? 'bg-red-600/20 text-red-400 border-red-500/30' :
                            u.role === 'banned' ? 'bg-gray-900 text-gray-500 border-gray-700' :
                            'bg-blue-600/20 text-blue-400 border-blue-500/30'
                          }`}>
                            {u.role}
                          </span>
                          {u.role === 'banned' && (
                            <span className="text-[9px] text-red-500 font-bold italic flex items-center gap-1">
                              <Ban className="w-2 h-2" /> ACCESS DENIED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                          {!isSuperAdminEmail(u.email) && u.id !== currentAdmin?.id && (
                            <>
                              {u.role === 'admin' ? (
                                <button
                                  onClick={() => demote(u.id, u.email)}
                                  disabled={loading === u.id}
                                  className="p-2 text-orange-400 hover:bg-orange-600/10 rounded-lg transition"
                                  title="Demote to Student"
                                >
                                  <UserMinus className="w-5 h-5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => promote(u.id, u.email)}
                                  disabled={u.role === 'banned' || loading === u.id}
                                  className="p-2 text-green-400 hover:bg-green-600/10 rounded-lg transition disabled:opacity-20"
                                  title="Promote to Admin"
                                >
                                  <ShieldCheck className="w-5 h-5" />
                                </button>
                              )}
                              
                              <button
                                onClick={() => banUser(u.id, u.email, u.role === 'banned')}
                                className={`p-2 rounded-lg transition ${
                                  u.role === 'banned' ? 'text-blue-400 hover:bg-blue-600/10' : 'text-orange-400 hover:bg-orange-600/10'
                                }`}
                                title={u.role === 'banned' ? 'Unban User' : 'Ban User'}
                              >
                                <Ban className="w-5 h-5" />
                              </button>
                              
                              <button
                                onClick={() => deleteUser(u.id, u.email)}
                                className="p-2 text-red-400 hover:bg-red-600/10 rounded-lg transition"
                                title="Delete Profile"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          
                          <button
                            onClick={() => togglePremium(u.id, !!isPremium)}
                            disabled={loading === u.id || isSuperAdminEmail(u.email)}
                            className={`p-2 rounded-lg transition ${
                              isPremium 
                                ? 'text-yellow-400 hover:bg-yellow-600/10' 
                                : 'text-green-400 hover:bg-green-600/10'
                            } disabled:opacity-20`}
                            title={isPremium ? 'Revoke Premium' : 'Grant Premium (30 days)'}
                          >
                            <Crown className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => sendResetPassword(u.email)}
                            className="p-2 text-amber-400 hover:bg-amber-600/10 rounded-lg transition"
                            title="Send Password Reset"
                          >
                            <KeyRound className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
