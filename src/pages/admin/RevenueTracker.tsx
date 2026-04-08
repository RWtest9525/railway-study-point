import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TrendingUp, DollarSign, IndianRupee, Calendar } from 'lucide-react';

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
}

export function RevenueTracker() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const transactionsRef = collection(db, 'transactions');
      const q = query(transactionsRef, orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      const txns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(txns);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const successfulTransactions = transactions.filter(t => t.status === 'success');
  const totalRevenue = successfulTransactions.reduce((sum, t) => sum + (t.amount / 100), 0);
  
  // Calculate this month's revenue
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const monthlyRevenue = successfulTransactions
    .filter(t => {
      const date = new Date(t.created_at);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    })
    .reduce((sum, t) => sum + (t.amount / 100), 0);

  if (loading) {
    return <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</div>;
  }

  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen p-6`}>
      <div className="mb-6">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Revenue Tracker</h1>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Track premium subscription revenue</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-green-500" />
            </div>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Revenue</span>
          </div>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>₹{totalRevenue.toFixed(0)}</p>
        </div>

        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>This Month</span>
          </div>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>₹{monthlyRevenue.toFixed(0)}</p>
        </div>

        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Transactions</span>
          </div>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{successfulTransactions.length}</p>
        </div>

        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-yellow-500" />
            </div>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Avg. Order</span>
          </div>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            ₹{successfulTransactions.length > 0 ? (totalRevenue / successfulTransactions.length).toFixed(0) : '0'}
          </p>
        </div>
      </div>

      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border overflow-hidden`}>
        <div className="px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent Transactions</h2>
        </div>
        <table className="w-full">
          <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <tr>
              <th className={`px-6 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>User ID</th>
              <th className={`px-6 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount</th>
              <th className={`px-6 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</th>
              <th className={`px-6 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Date</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {transactions.slice(0, 10).map((txn) => (
              <tr key={txn.id} className={`hover:${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <td className={`px-6 py-4 font-mono text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {txn.user_id.substring(0, 16)}...
                </td>
                <td className={`px-6 py-4 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  ₹{(txn.amount / 100).toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    txn.status === 'success' 
                      ? 'bg-green-600/20 text-green-400' 
                      : txn.status === 'pending'
                      ? 'bg-yellow-600/20 text-yellow-400'
                      : 'bg-red-600/20 text-red-400'
                  }`}>
                    {txn.status}
                  </span>
                </td>
                <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {txn.created_at ? new Date(txn.created_at).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}