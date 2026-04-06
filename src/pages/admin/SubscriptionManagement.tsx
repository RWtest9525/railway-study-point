import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  CreditCard, 
  Search, 
  Crown, 
  Users, 
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

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

export function SubscriptionManagement() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'active' | 'expired' | 'never'>('all');
  const [loading, setLoading] = useState(false);
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
      const { data, error: qErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, role, is_premium, premium_until, premium_started_at, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (qErr) {
        console.error('Error loading users:', qErr);
        // Fallback if created_at doesn't exist
        if (qErr.message?.includes('created_at') || qErr.message?.includes('does not exist')) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('profiles')
            .select('id, email, full_name, phone, role, is_premium, premium_until, premium_started_at')
            .limit(100);
          
          if (!fallbackError && fallbackData) {
            const usersWithDate = fallbackData.map(u => ({
              ...u,
              created_at: new Date().toISOString()
            }));
            setUsers(usersWithDate);
          }
        }
        return;
      }
      setUsers(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load subscription data. Please ensure the database schema is properly set up.');
    } finally {
      setListLoading(false);
    }
  };

  const extendSubscription = async (userId: string, days: number) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { data: user } = await supabase
        .from('profiles')
        .select('premium_until')
        .eq('id', userId)
        .single();

      const currentExpiry = user?.premium_until ? new Date(user.premium_until) : new Date();
      const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);

      const { error: uErr } = await supabase
        .from('profiles')
        .update({ 
          is_premium: true, 
          premium_until: newExpiry.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (uErr) throw uErr;
      setMessage(`Subscription extended by ${days} days.`);
      loadUsers();
    } catch (err) {
      console.error(err);
      setError('Could not extend subscription.');
    } finally {
      setLoading(false);
    }
  };

  const revokeSubscription = async (userId: string) => {
    if (!confirm('Are you sure you want to revoke this user\'s premium subscription?')) return;
    
    setLoading(true);
    try {
      const { error: uErr } = await supabase
        .from('profiles')
        .update({ 
          is_premium: false, 
          premium_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (uErr) throw uErr;
      setMessage('Premium subscription revoked.');
      loadUsers();
    } catch (err) {
      console.error(err);
      setError('Could not revoke subscription.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    let subscriptionStatus: 'active' | 'expired' | 'never';
    if (u.is_premium && u.premium_until && new Date(u.premium_until) > new Date()) {
      subscriptionStatus = 'active';
    } else if (u.premium_until) {
      subscriptionStatus = 'expired';
    } else {
      subscriptionStatus = 'never';
    }

    const matchesSubscription = subscriptionFilter === 'all' || subscriptionFilter === subscriptionStatus;

    return matchesSearch && matchesSubscription;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_premium && u.premium_until && new Date(u.premium_until) > new Date()).length,
    expired: users.filter(u => u.premium_until && (!u.is_premium || new Date(u.premium_until) <= new Date())).length,
    never: users.filter(u => !u.premium_until).length
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-3`}>
            <CreditCard className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            Subscription Management
          </h2>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm mt-1`}>Monitor and manage user premium subscriptions</p>
        </div>
        <button
          onClick={loadUsers}
          disabled={listLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${listLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 border`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Users</p>
            </div>
          </div>
        </div>
        
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 border`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.active}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Active Premium</p>
            </div>
          </div>
        </div>
        
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 border`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600/20 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.expired}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Expired</p>
            </div>
          </div>
        </div>
        
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 border`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.never}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Never Subscribed</p>
            </div>
          </div>
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
              {(['all', 'active', 'expired', 'never'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSubscriptionFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    subscriptionFilter === f 
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
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Subscription Status</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'} hidden md:table-cell`}>Valid Until</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'} hidden lg:table-cell`}>Joined At</th>
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
                  const isActive = u.is_premium && u.premium_until && new Date(u.premium_until) > new Date();
                  const isExpired = u.premium_until && (!u.is_premium || new Date(u.premium_until) <= new Date());
                  
                  return (
                    <tr key={u.id} className={`${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'} transition group`}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold`}>{u.full_name || 'Student'}</span>
                          <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'} text-xs`}>{u.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <>
                              <Crown className="w-4 h-4 text-yellow-500" />
                              <span className={`${isDark ? 'text-green-400' : 'text-green-600'} font-medium text-sm`}>Active Premium</span>
                            </>
                          ) : isExpired ? (
                            <>
                              <XCircle className="w-4 h-4 text-orange-500" />
                              <span className={`${isDark ? 'text-orange-400' : 'text-orange-600'} font-medium text-sm`}>Expired</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                              <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'} font-medium text-sm`}>Never Subscribed</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        {u.premium_until ? (
                          <div className="flex flex-col">
                            <span className={`${isDark ? 'text-white' : 'text-gray-900'} text-sm`}>{new Date(u.premium_until).toLocaleDateString()}</span>
                            <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'} text-xs`}>{new Date(u.premium_until).toLocaleTimeString()}</span>
                          </div>
                        ) : (
                          <span className={`${isDark ? 'text-gray-600' : 'text-gray-500'} text-sm italic`}>No subscription</span>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="flex flex-col">
                          <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs`}>{new Date(u.created_at).toLocaleDateString()}</span>
                          <span className={`${isDark ? 'text-gray-600' : 'text-gray-400'} text-xs`}>{new Date(u.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                          {!isActive && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => extendSubscription(u.id, 7)}
                                disabled={loading}
                                className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition"
                                title="Extend by 7 days"
                              >
                                +7d
                              </button>
                              <button
                                onClick={() => extendSubscription(u.id, 30)}
                                disabled={loading}
                                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                                title="Extend by 30 days"
                              >
                                +30d
                              </button>
                            </div>
                          )}
                          {isActive && (
                            <button
                              onClick={() => revokeSubscription(u.id)}
                              disabled={loading}
                              className={`p-2 ${isDark ? 'text-red-400 hover:bg-red-600/10' : 'text-red-600 hover:bg-red-100'} rounded-lg transition`}
                              title="Revoke Subscription"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
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
