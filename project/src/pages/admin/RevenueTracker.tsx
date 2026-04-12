import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock, CreditCard, Download, TrendingUp, XCircle } from 'lucide-react';
import { collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatDateTime } from '../../lib/dateUtils';
import { useTheme } from '../../contexts/ThemeContext';
import { getUsers, UserProfile } from '../../lib/firestore';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  status?: string;
  payment_method?: string;
  plan_type?: 'monthly' | 'yearly' | 'lifetime';
  created_at?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  failure_reason?: string;
}

const normalizeAmount = (amount: number) => (amount > 1000 ? amount / 100 : amount);

const normalizeStatus = (transaction: Transaction) => {
  if (transaction.razorpay_payment_id || transaction.status === 'success') return 'success';
  if (transaction.status === 'cancelled' || transaction.status === 'failed') return 'cancelled';
  return 'pending';
};

export function RevenueTracker() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    void loadRevenueData();
  }, []);

  const loadRevenueData = async () => {
    setLoading(true);
    try {
      const [transactionsSnapshot, users] = await Promise.all([
        getDocs(query(collection(db, 'transactions'), orderBy('created_at', 'desc'))),
        getUsers(),
      ]);
      setTransactions(transactionsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Transaction)));
      setProfiles(users);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles]
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => selectedStatus === 'all' || normalizeStatus(transaction) === selectedStatus),
    [transactions, selectedStatus]
  );

  const displayedTransactions = expanded ? filteredTransactions : filteredTransactions.slice(0, 10);

  const stats = useMemo(() => {
    const successful = transactions.filter((transaction) => normalizeStatus(transaction) === 'success');
    const pending = transactions.filter((transaction) => normalizeStatus(transaction) === 'pending');
    const cancelled = transactions.filter((transaction) => normalizeStatus(transaction) === 'cancelled');
    return {
      totalRevenue: successful.reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0),
      successCount: successful.length,
      pendingCount: pending.length,
      cancelledCount: cancelled.length,
    };
  }, [transactions]);

  const handleApproveTransaction = async (transaction: Transaction) => {
    if (normalizeStatus(transaction) !== 'pending') return;
    if (!confirm('Approve this stuck payment manually? Use this only if payment was actually received.')) return;
    await updateDoc(doc(db, 'transactions', transaction.id), {
      status: 'success',
      updated_at: new Date().toISOString(),
    });
    await loadRevenueData();
    toast.success('Transaction marked as success');
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'User', 'Phone', 'Amount', 'Status', 'Payment Method', 'Plan Type'];
    const rows = filteredTransactions.map((transaction) => {
      const profile = profileById.get(transaction.user_id);
      return [
        formatDateTime(transaction.created_at || ''),
        profile?.full_name || transaction.user_id,
        profile?.phone || '',
        normalizeAmount(transaction.amount),
        normalizeStatus(transaction),
        transaction.payment_method || 'razorpay',
        transaction.plan_type || '-',
      ];
    });
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `revenue-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen p-6`}>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Revenue Tracker</h1>
          <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Latest transactions first. Pending is only for stuck payments, cancelled is for closed or failed attempts.
          </p>
        </div>
        <div className="flex items-center gap-3">

          <button onClick={handleExportCSV} className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Revenue', value: `Rs ${stats.totalRevenue.toFixed(0)}`, icon: CreditCard, tone: 'text-blue-500' },
          { label: 'Success', value: stats.successCount, icon: CheckCircle, tone: 'text-green-500' },
          { label: 'Pending', value: stats.pendingCount, icon: Clock, tone: 'text-amber-500' },
          { label: 'Cancelled', value: stats.cancelledCount, icon: XCircle, tone: 'text-red-500' },
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
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            {['all', 'success', 'pending', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setSelectedStatus(status);
                  setExpanded(false);
                }}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  selectedStatus === status
                    ? 'bg-blue-600 text-white'
                    : isDark
                    ? 'bg-gray-900 text-gray-300'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          {filteredTransactions.length > 10 && (
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
            >
              {expanded ? 'Show less' : 'See more'}
            </button>
          )}
        </div>

        {loading ? (
          <div className={`py-10 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading transactions...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className={isDark ? 'bg-gray-900/70' : 'bg-gray-50'}>
                <tr>
                  {['Date', 'User', 'Amount', 'Status', 'Method', 'Plan', 'Actions'].map((head) => (
                    <th key={head} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {displayedTransactions.map((transaction) => {
                  const status = normalizeStatus(transaction);
                  const profile = profileById.get(transaction.user_id);
                  return (
                    <tr key={transaction.id} className={isDark ? 'hover:bg-gray-900/40' : 'hover:bg-gray-50'}>
                      <td className={`px-4 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{formatDateTime(transaction.created_at || '')}</td>
                      <td className="px-4 py-4">
                        <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{profile?.full_name || 'Unknown user'}</div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{profile?.phone || profile?.email || transaction.user_id}</div>
                      </td>
                      <td className={`px-4 py-4 text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Rs {normalizeAmount(transaction.amount).toFixed(2)}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className={`px-4 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{transaction.payment_method || 'razorpay'}</td>
                      <td className={`px-4 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{transaction.plan_type || '-'}</td>
                      <td className="px-4 py-4">
                        {status === 'pending' ? (
                          <button onClick={() => void handleApproveTransaction(transaction)} className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Approve if paid
                          </button>
                        ) : status === 'cancelled' ? (
                          <span className="text-xs text-slate-500">{transaction.failure_reason || 'Payment cancelled or failed'}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Success
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
