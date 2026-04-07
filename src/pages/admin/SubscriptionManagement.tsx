import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Crown, Check, X, Clock } from 'lucide-react';

interface Subscription {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  razorpay_payment_id?: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
}

export function SubscriptionManagement() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load subscriptions
      const transactionsRef = collection(db, 'transactions');
      const q = query(transactionsRef, orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
      setSubscriptions(subs);

      // Load users
      const usersRef = collection(db, 'profiles');
      const usersSnapshot = await getDocs(usersRef);
      const usersMap = new Map<string, User>();
      usersSnapshot.docs.forEach(doc => {
        usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User);
      });
      setUsers(usersMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="flex items-center gap-1 text-green-400">
            <Check className="w-4 h-4" /> Success
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-yellow-400">
            <Clock className="w-4 h-4" /> Pending
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-red-400">
            <X className="w-4 h-4" /> Failed
          </span>
        );
      default:
        return <span className="text-gray-400">{status}</span>;
    }
  };

  if (loading) {
    return <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</div>;
  }

  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen p-6`}>
      <div className="mb-6">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Subscription Management</h1>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>View all premium subscriptions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6`}>
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Revenue</span>
          </div>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            ₹{(subscriptions.filter(s => s.status === 'success').reduce((sum, s) => sum + (s.amount / 100), 0)).toFixed(0)}
          </p>
        </div>
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6`}>
          <div className="flex items-center gap-3 mb-2">
            <Check className="w-6 h-6 text-green-500" />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Successful</span>
          </div>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {subscriptions.filter(s => s.status === 'success').length}
          </p>
        </div>
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6`}>
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-yellow-500" />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pending</span>
          </div>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {subscriptions.filter(s => s.status === 'pending').length}
          </p>
        </div>
      </div>

      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border overflow-hidden`}>
        <table className="w-full">
          <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <tr>
              <th className={`px-6 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>User</th>
              <th className={`px-6 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount</th>
              <th className={`px-6 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</th>
              <th className={`px-6 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Payment ID</th>
              <th className={`px-6 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Date</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {subscriptions.map((sub) => {
              const user = users.get(sub.user_id);
              return (
                <tr key={sub.id} className={`hover:${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4">
                    <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {user?.full_name || 'Unknown'}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {user?.email || sub.user_id}
                    </div>
                  </td>
                  <td className={`px-6 py-4 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    ₹{(sub.amount / 100).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(sub.status)}
                  </td>
                  <td className={`px-6 py-4 font-mono text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {sub.razorpay_payment_id ? sub.razorpay_payment_id.substring(0, 16) + '...' : '-'}
                  </td>
                  <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}