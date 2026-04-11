import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { RouterProvider } from './contexts/RouterContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TrialUpgradeNudge } from './components/TrialUpgradeNudge';
import { Toaster, toast, resolveValue } from 'react-hot-toast';
import { X } from 'lucide-react';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider>
        <AuthProvider>
          <TrialUpgradeNudge />
          <Toaster position="top-right">
            {(t) => (
              <div
                className={`
                  max-w-xs w-full bg-[#1F2937] text-white shadow-2xl rounded-2xl pointer-events-auto flex flex-col overflow-hidden transition-all duration-300
                  ${t.visible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'}
                `}
                style={{ zIndex: 9999 }}
              >
                <div className="flex p-4 items-start gap-3">
                  {t.type === 'success' && <div className="text-emerald-500 shrink-0 text-lg">✓</div>}
                  {t.type === 'error' && <div className="text-red-500 shrink-0 text-lg">✕</div>}
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <p className="text-sm font-medium pr-2">{resolveValue(t.message, t)}</p>
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="ml-2 shrink-0 bg-transparent rounded-lg p-1 hover:bg-gray-700 inline-flex items-center justify-center text-gray-400 hover:text-white transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="h-1 bg-gray-800 w-full relative">
                  <div
                    className={`absolute left-0 top-0 h-full ${t.type === 'error' ? 'bg-red-500' : t.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    style={{
                      width: '100%',
                      animation: t.visible ? 'toast-progress 3s linear forwards' : 'none',
                    }}
                  />
                </div>
              </div>
            )}
          </Toaster>
          <App />
        </AuthProvider>
      </RouterProvider>
    </ThemeProvider>
  </StrictMode>
);
