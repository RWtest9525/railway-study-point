import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
    setError('');
    try {
      console.log('Loading users from Supabase...');
      
      // Check if created_at column exists by trying to query it
      const { data, error: qErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, role, is_premium, premium_until, premium_started_at, created_at, updated_at')
        .order('created_at', { ascending: false });

      console.log('Users data:', data);
      console.log('Users error:', qErr);

      if (qErr) {
        console.error('Error loading users:', qErr);
        
        // Check if it's a column not found error
        if (qErr.message?.includes('created_at') || qErr.message?.includes('does not exist')) {
          // Try without created_at ordering
          console.log('Trying without created_at column...');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('profiles')
            .select('id, email, full_name, phone, role, is_premium, premium_until, premium_started_at')
            .limit(100);
          
          if (fallbackError) {
            setError(`Failed to load users: ${fallbackError.message}. Please ensure the database schema is properly set up.`);
            setUsers([]);
          } else {
            // Add a dummy created_at for display purposes
            const usersWithDate = (fallbackData || []).map(u => ({
              ...u,
              created_at: new Date().toISOString()
            }));
            setUsers(usersWithDate);
          }
        } else {
          setError(`Failed to load users: ${qErr.message}. Please check your Supabase permissions.`);
          setUsers([]);
        }
      } else if (!data) {
        console.log('No data returned from Supabase');
        setUsers([]);
      } else {
        console.log('Setting users:', data.length, 'users found');
        setUsers(data);
      }
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError(`Failed to load users: ${err.message || 'Unknown error'}. Please run the master migration script.`);
      setUsers([]);
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
      (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const isPremium = u.is_premium && u.premium_until && new Date(u.premium_until) > new Date();
    const matchesPremium = premiumFilter === 'all' || 
      (premiumFilter === 'premium' && isPremium) || 
      (premiumFilter === 'free' && !isPremium);

    return matchesSearch && matchesPremium;
  });

  console.log('Total users:', users.length);
  console.log('Filtered users:', filteredUsers.length);
  console.log('Search query:', searchQuery);
  console.log('Premium filter:', premiumFilter);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-3`}>
            <UserPlus className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            User Management
          </h2>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm mt-1`}>Manage permissions, subscriptions, and account security</p>
        </div>
      </div>

      {message && (
        <div className={`${isDark ? 'bg-green-900/40 border-green-600 text-green-200' : 'bg-green-50 border-green-200 text-green-700'} px-4 py-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2 border`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-green-500' : 'bg-green-600'}`} />
          {message}
        </div>
      )}
      {error && (
        <div className={`${isDark ? 'bg-red-900/40 border-red-600 text-red-200' : 'bg-red-50 border-red-200 text-red-700'} px-4 py-3 rounded-xl text-sm border`}>
          {error}
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 border ${isDark ? '' : 'shadow-lg'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{users.length}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Users</p>
            </div>
          </div>
        </div>
        
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 border ${isDark ? '' : 'shadow-lg'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {users.filter(u => u.role === 'admin').length}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Admins</p>
            </div>
          </div>
        </div>
        
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 border ${isDark ? '' : 'shadow-lg'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
              <Crown className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {users.filter(u => u.is_premium && u.premium_until && new Date(u.premium_until) > new Date()).length}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Premium Users</p>
            </div>
          </div>
        </div>
        
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 border ${isDark ? '' : 'shadow-lg'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-600/20 rounded-lg flex items-center justify-center">
              <Ban className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {users.filter(u => u.role === 'banned').length}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Banned</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border overflow-hidden ${isDark ? 'shadow-2xl' : 'shadow-lg'}`}>
        <div className={`p-4 sm:p-6 border-b ${isDark ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'} flex flex-col lg:flex-row items-center gap-4`}>
          <div className="relative w-full lg:flex-1">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-12 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isDark ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
            />
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <Filter className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'} shrink-0`} />
            <div className={`flex ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-gray-100 border-gray-300'} rounded-xl p-1 border w-full lg:w-auto`}>
              {(['all', 'premium', 'free'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setPremiumFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    premiumFilter === f 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                      : isDark
                        ? 'text-gray-400 hover:text-gray-200'
                        : 'text-gray-600 hover:text-gray-900'
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
            <thead className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>User</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'} hidden lg:table-cell`}>Subscription</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'} hidden md:table-cell`}>Joined At</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Role/Status</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700/50' : 'divide-gray-200'}`}>
              {listLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`px-6 py-12 text-center ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isPremium = u.is_premium && u.premium_until && new Date(u.premium_until) > new Date();
                  return (
                    <tr key={u.id} className={`${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'} transition group`}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold`}>{u.full_name || 'Student'}</span>
                            {isSuperAdminEmail(u.email) && (
                              <span className={`${isDark ? 'bg-amber-500/20 text-amber-500 border-amber-500/20' : 'bg-amber-100 text-amber-700 border-amber-300'} text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border flex items-center gap-1`}>
                                <ShieldAlert className="w-2 h-2" /> Super Admin
                              </span>
                            )}
                            {u.id === currentAdmin?.id && (
                              <span className={`${isDark ? 'bg-blue-500/20 text-blue-400 border-blue-500/20' : 'bg-blue-100 text-blue-700 border-blue-300'} text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border`}>
                                You
                              </span>
                            )}
                          </div>
                          <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'} text-xs flex items-center gap-1`}>
                            <Mail className="w-3 h-3" />
                            {u.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        {isPremium ? (
                          <div className="flex flex-col gap-1">
                            <span className={`flex items-center gap-1.5 ${isDark ? 'text-yellow-500' : 'text-yellow-600'} font-bold text-xs uppercase tracking-wider`}>
                              <Crown className="w-3.5 h-3.5" />
                              Premium Active
                            </span>
                            <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'} text-[10px] flex items-center gap-1`}>
                              <Calendar className="w-2.5 h-2.5" />
                              Ends: {new Date(u.premium_until!).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className={`${isDark ? 'text-gray-600' : 'text-gray-500'} text-xs font-medium italic`}>Free Plan</span>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="flex flex-col">
                          <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs`}>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {new Date(u.created_at).toLocaleDateString()}
                          </span>
                          <span className={`${isDark ? 'text-gray-600' : 'text-gray-400'} text-xs mt-0.5`}>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(u.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border w-fit ${
                            u.role === 'admin' ? `${isDark ? 'bg-red-600/20 text-red-400 border-red-500/30' : 'bg-red-100 text-red-700 border-red-300'}` :
                            u.role === 'banned' ? `${isDark ? 'bg-gray-900 text-gray-500 border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-300'}` :
                            `${isDark ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-blue-100 text-blue-700 border-blue-300'}`
                          }`}>
                            {u.role}
                          </span>
                          {u.role === 'banned' && (
                            <span className={`text-[9px] ${isDark ? 'text-red-500' : 'text-red-600'} font-bold italic flex items-center gap-1`}>
                              <Ban className="w-2 h-2" /> ACCESS DENIED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2 opacity-100 transition-all flex-wrap">
                          {!isSuperAdminEmail(u.email) && u.id !== currentAdmin?.id && (
                            <>
                              {u.role === 'admin' ? (
                                <button
                                  onClick={() => demote(u.id, u.email)}
                                  disabled={loading === u.id}
                                  className={`p-2 ${isDark ? 'text-orange-400 hover:bg-orange-600/10' : 'text-orange-600 hover:bg-orange-100'} rounded-lg transition`}
                                  title="Demote to Student"
                                >
                                  <UserMinus className="w-5 h-5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => promote(u.id, u.email)}
                                  disabled={u.role === 'banned' || loading === u.id}
                                  className={`p-2 ${isDark ? 'text-green-400 hover:bg-green-600/10' : 'text-green-600 hover:bg-green-100'} rounded-lg transition disabled:opacity-20`}
                                  title="Promote to Admin"
                                >
                                  <ShieldCheck className="w-5 h-5" />
                                </button>
                              )}
                              
                              <button
                                onClick={() => banUser(u.id, u.email, u.role === 'banned')}
                                className={`p-2 rounded-lg transition ${
                                  u.role === 'banned' 
                                    ? `${isDark ? 'text-blue-400 hover:bg-blue-600/10' : 'text-blue-600 hover:bg-blue-100'}`
                                    : `${isDark ? 'text-orange-400 hover:bg-orange-600/10' : 'text-orange-600 hover:bg-orange-100'}`
                                }`}
                                title={u.role === 'banned' ? 'Unban User' : 'Ban User'}
                              >
                                <Ban className="w-5 h-5" />
                              </button>
                              
                              <button
                                onClick={() => deleteUser(u.id, u.email)}
                                className={`p-2 ${isDark ? 'text-red-400 hover:bg-red-600/10' : 'text-red-600 hover:bg-red-100'} rounded-lg transition`}
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
                                ? `${isDark ? 'text-yellow-400 hover:bg-yellow-600/10' : 'text-yellow-600 hover:bg-yellow-100'}`
                                : `${isDark ? 'text-green-400 hover:bg-green-600/10' : 'text-green-600 hover:bg-green-100'}`
                            } disabled:opacity-20`}
                            title={isPremium ? 'Revoke Premium' : 'Grant Premium (30 days)'}
                          >
                            <Crown className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => sendResetPassword(u.email)}
                            className={`p-2 ${isDark ? 'text-amber-400 hover:bg-amber-600/10' : 'text-amber-600 hover:bg-amber-100'} rounded-lg transition`}
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
