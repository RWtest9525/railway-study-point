import { useEffect, useState } from 'react';
import { AlertCircle, Download, Edit, LogIn, Plus, Shield, Trash2 } from 'lucide-react';
import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTheme } from '../../contexts/ThemeContext';

interface LogEntry {
  id: string;
  action: string;
  detail: string;
  adminName: string;
  timestamp: Date;
  type: 'delete' | 'create' | 'edit' | 'login' | 'export' | 'warning';
}

interface AdminProfile {
  id: string;
  email: string;
  full_name: string;
  created_at?: string;
}

const iconMap = {
  delete: <Trash2 className="w-4 h-4 text-red-500" />,
  create: <Plus className="w-4 h-4 text-green-500" />,
  edit: <Edit className="w-4 h-4 text-blue-500" />,
  login: <LogIn className="w-4 h-4 text-purple-500" />,
  export: <Download className="w-4 h-4 text-orange-500" />,
  warning: <AlertCircle className="w-4 h-4 text-yellow-500" />,
};

const colorMap = {
  delete: 'bg-red-500/10',
  create: 'bg-green-500/10',
  edit: 'bg-blue-500/10',
  login: 'bg-purple-500/10',
  export: 'bg-orange-500/10',
  warning: 'bg-yellow-500/10',
};

export function ActivityLogs() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const logsQuery = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(30));
    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      setLogs(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
          timestamp: item.data().timestamp?.toDate() || new Date(),
        })) as LogEntry[]
      );
      setLoading(false);
    });

    void getDocs(query(collection(db, 'profiles'), where('role', '==', 'admin'))).then((snapshot) => {
      setAdmins(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as AdminProfile)));
    });

    return () => unsubscribe();
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Manage Admins</h2>
        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>See every admin account and the latest admin-side activity together.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {admins.map((admin) => (
          <div key={admin.id} className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} rounded-3xl border p-5 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{admin.full_name || 'Admin'}</div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{admin.email}</div>
              </div>
            </div>
            <div className={`mt-3 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Joined: {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : 'Unknown'}
            </div>
          </div>
        ))}
      </div>

      <div className={`${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} rounded-3xl border shadow-sm overflow-hidden`}>
        {loading ? (
          <div className={`p-8 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading admin activity...</div>
        ) : logs.length === 0 ? (
          <div className={`p-8 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No admin activity logs yet.</div>
        ) : (
          <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {logs.map((log) => (
              <div key={log.id} className={`flex items-start gap-4 p-4 ${isDark ? 'hover:bg-gray-900/40' : 'hover:bg-gray-50'}`}>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${colorMap[log.type]}`}>{iconMap[log.type]}</div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{log.action}</div>
                  <div className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{log.detail}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{log.adminName}</div>
                  <div className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{formatTime(log.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
