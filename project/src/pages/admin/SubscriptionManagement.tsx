import { useEffect, useMemo, useState } from 'react';
import { Check, Clock3, Crown, Search, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTheme } from '../../contexts/ThemeContext';

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  status?: string;
  razorpay_payment_id?: string;
  created_at?: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_premium: boolean;
  premium_until?: string | null;
}

const normalizeAmount = (amount: number) => (amount > 1000 ? amount / 100 : amount);

export function SubscriptionManagement() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transactionsSnapshot, profilesSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'transactions'), orderBy('created_at', 'desc'))),
        getDocs(collection(db, 'profiles')),
      ]);

      setTransactions(transactionsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Transaction)));
      setProfiles(profilesSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as UserProfile)));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const grantPremium = async (userId: string, days: number) => {
    const premiumUntil = new Date();
    premiumUntil.setDate(premiumUntil.getDate() + days);
    await updateDoc(doc(db, 'profiles', userId), {
      is_premium: true,
      premium_until: premiumUntil.toISOString(),
      updated_at: new Date().toISOString(),
    });
    await loadData();
    toast.success(`Premium granted for ${days} days`);
  };

  const revokePremium = async (userId: string) => {
    await updateDoc(doc(db, 'profiles', userId), {
      is_premium: false,
      premium_until: null,
      updated_at: new Date().toISOString(),
    });
    await loadData();
    toast.success('Premium removed');
  };

  const filteredProfiles = useMemo(
    () =>
      profiles.filter((profile) =>
        `${profile.full_name} ${profile.email}`.toLowerCase().includes(search.toLowerCase())
      ),
    [profiles, search]
  );

  const paidTransactions = transactions.filter((transaction) => transaction.status === 'success' || transaction.razorpay_payment_id);
  const activePremiumUsers = profiles.filter((profile) => profile.is_premium && (!profile.premium_until || new Date(profile.premium_until) > new Date()));

  if (loading) {
    return <div className={`py-10 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading subscriptions...</div>;
  }

  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen p-6`}>
      <div className="mb-6">
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Subscription Management</h1>
        <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>See who currently has premium and manage gifted access here. Revenue details stay in the revenue tab.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Active premium users', value: activePremiumUsers.length, icon: Crown, tone: 'text-amber-500' },
          { label: 'Paid subscriptions', value: paidTransactions.length, icon: Check, tone: 'text-green-500' },
          { label: 'Collected amount', value: `₹${paidTransactions.reduce((sum, item) => sum + normalizeAmount(item.amount), 0).toFixed(0)}`, icon: Clock3, tone: 'text-blue-500' },
        ].map((item) => (
          <div key={item.label} className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} rounded-3xl border p-5 shadow-sm`}>
            <div className="flex items-center gap-3">
              <item.icon className={`h-5 w-5 ${item.tone}`} />
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</span>
            </div>
            <div className={`mt-3 text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} mt-6 rounded-3xl border p-5 shadow-sm`}>
        <label className="relative block">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search premium users by name or email"
            className={`w-full rounded-2xl border py-3 pl-11 pr-4 text-sm ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
          />
        </label>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full">
            <thead className={isDark ? 'bg-gray-900/70' : 'bg-gray-50'}>
              <tr>
                {['User', 'Status', 'Expiry', 'Actions'].map((head) => (
                  <th key={head} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredProfiles.map((profile) => {
                const isActive = profile.is_premium && (!profile.premium_until || new Date(profile.premium_until) > new Date());
                return (
                  <tr key={profile.id} className={isDark ? 'hover:bg-gray-900/40' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-4">
                      <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{profile.full_name || 'Unknown'}</div>
                      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{profile.email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                        {isActive ? 'Premium active' : 'Free user'}
                      </span>
                    </td>
                    <td className={`px-4 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {profile.premium_until ? new Date(profile.premium_until).toLocaleDateString() : 'Not set'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => void grantPremium(profile.id, 30)} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                          <UserPlus className="h-3.5 w-3.5" />
                          30 days
                        </button>
                        <button onClick={() => void grantPremium(profile.id, 365)} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                          365 days
                        </button>
                        {profile.is_premium && (
                          <button onClick={() => void revokePremium(profile.id)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                            <X className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
