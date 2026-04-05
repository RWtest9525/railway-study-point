import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, Search, Trash2, Ban, ShieldCheck, Mail, Phone, KeyRound, UserMinus, ShieldAlert } from 'lucide-react';
import { normalizeEmail, isSuperAdminEmail } from '../../lib/authUtils';

type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'admin' | 'student' | 'banned';
  created_at: string;
};

export function UserManagement() {
  const { profile: currentAdmin } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-blue-400" />
            User Management
          </h2>
          <p className="text-gray-400 text-sm mt-1">Manage permissions, bans, and account security</p>
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
        <div className="p-4 sm:p-6 border-b border-gray-700 bg-gray-700/30 flex flex-col sm:row items-center gap-4">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 text-white pl-12 pr-4 py-3 rounded-xl border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role/Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {listLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
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
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex flex-col text-gray-400 text-xs">
                        {u.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {u.phone}
                          </span>
                        ) : (
                          <span className="italic text-gray-600">No phone</span>
                        )}
                        <span className="mt-1">Joined: {new Date(u.created_at).toLocaleDateString()}</span>
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
                          onClick={() => sendResetPassword(u.email)}
                          className="p-2 text-amber-400 hover:bg-amber-600/10 rounded-lg transition"
                          title="Send Password Reset"
                        >
                          <KeyRound className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
