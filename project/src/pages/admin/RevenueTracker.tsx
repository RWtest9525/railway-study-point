import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatDate, formatDateTime } from '../../lib/dateUtils';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Users, Download, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  status: 'success' | 'pending' | 'failed';
  payment_method: string;
  plan_type: 'monthly' | 'yearly' | 'lifetime';
  created_at: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
}

interface RevenueStats {
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyGrowth: number;
  pendingTransactions: number;
  failedTransactions: number;
  activeSubscriptions: number;
}

export function RevenueTracker() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    weeklyGrowth: 0,
    pendingTransactions: 0,
    failedTransactions: 0,
    activeSubscriptions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');

  useEffect(() => {
    loadRevenueData();
  }, [dateRange]);

  const loadRevenueData = async () => {
    setLoading(true);
    try {
      // Load transactions
      const transactionsRef = collection(db, 'transactions');
      const q = query(transactionsRef, orderBy('created_at', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      const txns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Transaction));
      setTransactions(txns);

      // Calculate stats
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const successfulTxns = txns.filter(t => t.status === 'success');
      const totalRevenue = successfulTxns.reduce((sum, t) => sum + t.amount, 0);
      
      const monthlyTxns = successfulTxns.filter(t => {
        const date = new Date(t.created_at);
        return date >= thirtyDaysAgo;
      });
      const monthlyRevenue = monthlyTxns.reduce((sum, t) => sum + t.amount, 0);

      const weeklyTxns = successfulTxns.filter(t => {
        const date = new Date(t.created_at);
        return date >= sevenDaysAgo;
      });
      const weeklyRevenue = weeklyTxns.reduce((sum, t) => sum + t.amount, 0);

      const prevWeekTxns = successfulTxns.filter(t => {
        const date = new Date(t.created_at);
        return date >= thirtyDaysAgo && date < sevenDaysAgo;
      });
      const prevWeekRevenue = prevWeekTxns.reduce((sum, t) => sum + t.amount, 0);

      const weeklyGrowth = prevWeekRevenue > 0 ? ((weeklyRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 : 0;

      setStats({
        totalRevenue: totalRevenue,
        monthlyRevenue: monthlyRevenue,
        weeklyGrowth: weeklyGrowth,
        pendingTransactions: txns.filter(t => t.status === 'pending').length,
        failedTransactions: txns.filter(t => t.status === 'failed').length,
        activeSubscriptions: successfulTxns.length,
      });
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (selectedStatus !== 'all' && t.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  const handleApproveTransaction = async (txnId: string) => {
    try {
      // Update transaction status in Firestore
      // This would be implemented with updateDoc
      alert(`Approved transaction: ${txnId}`);
      loadRevenueData();
    } catch (error) {
      console.error('Error approving transaction:', error);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'User ID', 'Amount', 'Status', 'Payment Method', 'Plan Type', 'Order ID', 'Payment ID'];
    const rows = transactions.map(t => [
      formatDateTime(t.created_at),
      t.user_id,
      t.amount,
      t.status,
      t.payment_method,
      t.plan_type,
      t.razorpay_order_id || '',
      t.razorpay_payment_id || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Revenue Tracker</h1>
          <p className="text-gray-400">Monitor income, transactions, and financial analytics</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Total Revenue
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</div>
          <div className="text-xs text-gray-500 mt-1">All time</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            Monthly Revenue
          </div>
          <div className="text-2xl font-bold text-green-400">{formatCurrency(stats.monthlyRevenue)}</div>
          <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <TrendingUp className={`w-4 h-4 ${stats.weeklyGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`} />
            Weekly Growth
          </div>
          <div className={`text-2xl font-bold ${stats.weeklyGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.weeklyGrowth >= 0 ? '+' : ''}{stats.weeklyGrowth.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">vs previous week</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <CreditCard className="w-4 h-4" />
            Active Subscriptions
          </div>
          <div className="text-2xl font-bold text-purple-400">{stats.activeSubscriptions}</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.pendingTransactions} pending, {stats.failedTransactions} failed
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
        >
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No transactions found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">User</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Payment Method</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Plan</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-gray-300 text-sm">
                    {formatDateTime(txn.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-300 text-sm font-mono">
                      {txn.user_id.substring(0, 12)}...
                    </div>
                    <div className="text-gray-500 text-xs">
                      {txn.razorpay_payment_id?.substring(0, 12) || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white font-bold">{formatCurrency(txn.amount)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      txn.status === 'success' ? 'bg-green-900/50 text-green-300 border border-green-500/30' :
                      txn.status === 'pending' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30' :
                      'bg-red-900/50 text-red-300 border border-red-500/30'
                    }`}>
                      {txn.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm capitalize">
                    {txn.payment_method}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-purple-900/30 text-purple-300 px-3 py-1 rounded-full text-xs font-bold capitalize">
                      {txn.plan_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {txn.status === 'pending' && (
                      <button
                        onClick={() => handleApproveTransaction(txn.id)}
                        className="text-green-400 hover:text-green-300 p-2"
                        title="Approve"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                    {txn.status === 'failed' && (
                      <button
                        onClick={() => loadRevenueData()}
                        className="text-yellow-400 hover:text-yellow-300 p-2"
                        title="Retry"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Revenue Chart Placeholder */}
      <div className="mt-6 bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Revenue Trend</h2>
        <div className="h-64 bg-gray-700/30 rounded-lg flex items-center justify-center text-gray-400">
          Revenue chart visualization would appear here
        </div>
      </div>
    </div>
  );
}