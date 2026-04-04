import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { DollarSign, Users, TrendingUp, Calendar } from 'lucide-react';

type Transaction = Database['public']['Tables']['transactions']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface TransactionWithProfile extends Transaction {
  profile?: Profile;
}

export function RevenueTracker() {
  const [transactions, setTransactions] = useState<TransactionWithProfile[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    successfulTransactions: 0,
    premiumUsers: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'success')
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      const userIds = [...new Set(transactionsData?.map((t) => t.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const transactionsWithProfiles = transactionsData?.map((transaction) => ({
        ...transaction,
        profile: profilesData?.find((p) => p.id === transaction.user_id),
      }));

      setTransactions(transactionsWithProfiles || []);

      const totalRevenue =
        transactionsData?.reduce((sum, t) => sum + t.amount, 0) || 0;

      const { count: premiumCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_premium', true);

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyTransactions = transactionsData?.filter(
        (t) => new Date(t.created_at) >= firstDayOfMonth
      );
      const monthlyRevenue =
        monthlyTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

      setStats({
        totalRevenue: totalRevenue / 100,
        successfulTransactions: transactionsData?.length || 0,
        premiumUsers: premiumCount || 0,
        monthlyRevenue: monthlyRevenue / 100,
      });
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white text-xl">Loading revenue data...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Revenue Tracker</h1>
        <p className="text-gray-400">Monitor your earnings and transactions</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6 border border-green-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <span className="text-green-100 text-sm font-medium">Total Revenue</span>
          </div>
          <div className="text-3xl font-bold text-white">
            ₹{stats.totalRevenue.toFixed(2)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 border border-blue-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-blue-100 text-sm font-medium">Successful Payments</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {stats.successfulTransactions}
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-xl p-6 border border-yellow-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="text-yellow-100 text-sm font-medium">Premium Users</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats.premiumUsers}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 border border-purple-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <span className="text-purple-100 text-sm font-medium">This Month</span>
          </div>
          <div className="text-3xl font-bold text-white">
            ₹{stats.monthlyRevenue.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
          <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No successful transactions yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Payment ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-gray-300">
                      {new Date(transaction.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">
                        {transaction.profile?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-400">
                        {transaction.profile?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-mono text-sm">
                      {transaction.razorpay_payment_id?.substring(0, 20)}...
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-green-400 font-semibold">
                        ₹{(transaction.amount / 100).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-green-900 text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
