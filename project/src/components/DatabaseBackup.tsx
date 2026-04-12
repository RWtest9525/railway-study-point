import { useState } from 'react';
import { Download, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ConfirmModal } from './ConfirmModal';

interface BackupData {
  users: any[];
  exams: any[];
  questions: any[];
  subscriptions: any[];
  createdAt: string;
}

export function DatabaseBackup() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const exportDatabase = async () => {
    setIsExporting(true);
    try {
      const [usersSnap, examsSnap, questionsSnap, subscriptionsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'exams')),
        getDocs(collection(db, 'questions')),
        getDocs(collection(db, 'subscriptions')),
      ]);

      const backupData: BackupData = {
        users: usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        exams: examsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        questions: questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        subscriptions: subscriptionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        createdAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `railway-study-point-backup-${new Date().toISOString().slice(0, 19)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (e: any) {
      console.error('Export failed:', e);
      setErrorMessage('Export failed: ' + (e.message || 'Unknown error'));
      setErrorModalOpen(true);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 shadow-lg border mb-6`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
          <Database className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Database Backup
          </h3>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Export full database as JSON
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          isDark ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-50 text-gray-600'
        }`}>
          <AlertTriangle className="w-4 h-4" />
          <span>
            This will export all users, exams, questions, and subscription data
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportDatabase}
            disabled={isExporting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition ${
              exported
                ? 'bg-green-500 text-white'
                : isExporting
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {exported ? (
              <><CheckCircle className="w-4 h-4" /> Exported!</>
            ) : isExporting ? (
              <><Download className="w-4 h-4 animate-spin" /> Exporting...</>
            ) : (
              <><Download className="w-4 h-4" /> Export Database</>
            )}
          </button>

          <button
            onClick={() => setImportModalOpen(true)}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm border transition ${
              isDark
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Import Database
          </button>
        </div>

        {exported && (
          <div className="flex items-center gap-2 text-sm text-green-500 font-medium">
            <CheckCircle className="w-4 h-4" />
            Database exported successfully! Check your downloads folder.
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        onConfirm={() => setImportModalOpen(false)}
        title="Import Database"
        message="Full Database imports must be run directly through the Firebase Console for security and data integrity. Please go to your Firebase Console > Firestore Database > Import/Export to perform this action."
        confirmText="Acknowledge"
        cancelText="Close"
        isDestructive={false}
      />

      <ConfirmModal
        isOpen={errorModalOpen}
        onCancel={() => setErrorModalOpen(false)}
        onConfirm={() => setErrorModalOpen(false)}
        title="Export Error"
        message={errorMessage}
        confirmText="Okay"
        cancelText="Close"
        isDestructive={true}
      />
    </div>
  );
}