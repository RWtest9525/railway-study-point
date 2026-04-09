import { useState, useEffect } from 'react';
import { Shield, Trash2, Plus, Edit, LogIn, Download, AlertCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

interface LogEntry {
  id: string;
  action: string;
  detail: string;
  adminName: string;
  timestamp: Date;
  type: 'delete' | 'create' | 'edit' | 'login' | 'export' | 'warning';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'activityLogs'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as LogEntry[]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            System Activity Logs
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Track all admin actions
          </p>
        </div>
      </div>

      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border shadow-lg overflow-hidden`}>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-16 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
              ))}
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No activity logs yet
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              Admin actions will appear here automatically
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map((log) => (
              <div key={log.id} className={`flex items-start gap-4 p-4 hover:${isDark ? 'bg-gray-700/30' : 'bg-gray-50'} transition`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[log.type]}`}>
                  {iconMap[log.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {log.action}
                  </p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {log.detail}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {log.adminName}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                    {formatTime(log.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export async function logActivity(
  action: string,
  detail: string,
  adminName: string,
  type: LogEntry['type']
) {
  try {
    await addDoc(collection(db, 'activityLogs'), {
      action, detail, adminName, type,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
}
