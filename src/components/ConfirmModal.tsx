import { X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false
}: ConfirmModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity">
      <div className={`w-full max-w-sm overflow-hidden rounded-[24px] border ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'} shadow-2xl`}>
        <div className="relative p-6">
          <button 
            onClick={onCancel}
            className={`absolute right-4 top-4 rounded-xl p-2 ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <X className="h-4 w-4" />
          </button>
          
          <h3 className={`mb-2 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {title}
          </h3>
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {message}
          </p>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={onCancel}
              className={`w-full rounded-2xl border px-5 py-3 text-sm font-semibold sm:w-auto ${
                isDark 
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300' 
                  : 'border-slate-300 hover:bg-slate-50 text-slate-700'
              }`}
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className={`w-full rounded-2xl px-5 py-3 text-sm font-semibold text-white sm:w-auto ${
                isDestructive
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
