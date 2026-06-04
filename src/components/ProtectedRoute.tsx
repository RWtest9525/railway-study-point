import { useAuth } from '../contexts/AuthContext';
import { Navigate } from './Navigate';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, effectiveRole, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Handle Banned User State
  if (effectiveRole === 'banned') {
    const isSupportPage = window.location.pathname === '/support';
    
    // If they are not on the support page, show the blocking popup
    if (!isSupportPage) {
      return (
        <div className="fixed inset-0 z-[9999] bg-slate-950 flex shadow-2xl items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#0A0D14] rounded-3xl p-8 border border-red-500/20 text-center shadow-[0_0_100px_rgba(220,38,38,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-600"></div>
            
            <div className="mx-auto w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 ring-4 ring-red-500/5">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-black text-white mb-3">Account Suspended</h2>
            
            <p className="text-slate-400 mb-6 leading-relaxed">
              You have been banned by the administration and restricted from accessing the application.
              If you believe this is a mistake, you can contact our support team.
            </p>
            
            {(profile as any)?.updated_at && (
              <div className="inline-block bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-extrabold px-3 py-1.5 rounded-lg mb-8 uppercase tracking-widest text-center shadow-inner">
                Date issued: {new Date((profile as any).updated_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            )}
            
            <button
              onClick={() => window.location.href = '/support'}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-bold transition duration-300"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Contact Support
            </button>

            <button
              onClick={async () => {
                const { getAuth, signOut } = await import('firebase/auth');
                await signOut(getAuth());
                window.location.href = '/login';
              }}
              className="mt-4 w-full flex items-center justify-center text-sm font-medium text-slate-500 hover:text-slate-300 py-2 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      );
    }
    // If they ARE on the support page, let the children render naturally!
  }

  if (requireAdmin && effectiveRole !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}
