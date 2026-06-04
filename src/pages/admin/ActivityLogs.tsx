import { useEffect, useState } from 'react';
import { AlertCircle, Download, Edit, LogIn, Plus, Shield, Trash2 } from 'lucide-react';
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { useTheme } from '../../contexts/ThemeContext';
import { ConfirmModal } from '../../components/ConfirmModal';
import toast from 'react-hot-toast';

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
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, isDestructive?: boolean}>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {admins.map((admin) => (
          <div key={admin.id} className={`flex flex-col justify-between ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} rounded-3xl border p-5 shadow-sm`}>
            <div>
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
            
            {admin.email !== 'yashvishal647@gmail.com' && (
              <div className={`mt-4 flex gap-2 border-t pt-4 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <button 
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: 'Reset Password',
                      message: `Send a password reset email to ${admin.email}?`,
                      onConfirm: async () => {
                        try {
                          await sendPasswordResetEmail(auth, admin.email);
                          toast.success('Reset email sent');
                        } catch (e) {
                          toast.error('Failed to send email');
                        }
                      }
                    });
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-semibold border transition ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                  Reset Pwd
                </button>
                <button 
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: 'Remove Admin',
                      message: `Demote ${admin.email} from admin role to student?`,
                      isDestructive: true,
                      onConfirm: async () => {
                        try {
                          await updateDoc(doc(db, 'profiles', admin.id), { role: 'student' });
                          setAdmins(prev => prev.filter(a => a.id !== admin.id));
                          toast.success('Admin demoted');
                        } catch (e) {
                          toast.error('Failed to demote');
                        }
                      }
                    });
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-semibold border transition ${isDark ? 'border-red-900/50 text-red-400 hover:bg-red-900/50' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>
                  Remove
                </button>
              </div>
            )}
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />
    </div>
  );
}
