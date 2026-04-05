import { useRouter } from './contexts/RouterContext';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ExamSelection } from './pages/ExamSelection';
import { SubjectSelection } from './pages/SubjectSelection';
import { ExamInterface } from './pages/ExamInterface';
import { Results } from './pages/Results';
import { Upgrade } from './pages/Upgrade';
import { Leaderboard } from './pages/Leaderboard';
import { ProfileEdit } from './pages/ProfileEdit';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Membership } from './pages/Membership';
import { ContactSupport } from './pages/ContactSupport';
import { AdminPortal } from './pages/admin/AdminPortal';

function AppContent() {
  const { currentPath, navigate } = useRouter();
  const { user, loading, effectiveRole, isBanned, signOut } = useAuth();

  // 1. BANNED CHECK: Highest Priority
  if (isBanned) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 border border-red-500/30 rounded-2xl p-8 max-w-md text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl text-red-500">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Account Banned</h1>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Your access to Railway Study Point has been suspended by an administrator. 
            Please contact support if you believe this is an error.
          </p>
          <button
            onClick={() => {
              signOut();
              navigate('/login');
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-red-900/20"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // 2. ADMIN OVERRIDE
  const isAdmin = effectiveRole === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Auth pages are public
  if (currentPath === '/forgot-password') return <ForgotPassword />;
  if (currentPath === '/reset-password') return <ResetPassword />;
  if (currentPath === '/signup') return <Signup />;
  if (currentPath === '/login') return <Login />;

  // If not logged in, go to login
  if (!user) return <Login />;

  // ADMIN OVERRIDE: If admin, prioritize Admin Portal
  if (isAdmin) {
    if (
      currentPath === '/dashboard' ||
      currentPath === '/' ||
      currentPath === '/admin-portal'
    ) {
      return (
        <ProtectedRoute requireAdmin>
          <AdminPortal />
        </ProtectedRoute>
      );
    }
  }

  // Standard Routing
  if (currentPath === '/dashboard' || currentPath === '/') {
    return (
      <ProtectedRoute>
        <ExamSelection />
      </ProtectedRoute>
    );
  }

  if (currentPath.startsWith('/exams/')) {
    const categoryId = currentPath.replace('/exams/', '');
    return (
      <ProtectedRoute>
        <SubjectSelection categoryId={categoryId} />
      </ProtectedRoute>
    );
  }

  if (currentPath.startsWith('/exam/')) {
    const examId = currentPath.replace('/exam/', '');
    return (
      <ProtectedRoute>
        <ExamInterface examId={examId} />
      </ProtectedRoute>
    );
  }

  if (currentPath.startsWith('/results/')) {
    const resultId = currentPath.replace('/results/', '');
    return (
      <ProtectedRoute>
        <Results resultId={resultId} />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/upgrade') {
    return (
      <ProtectedRoute>
        <Upgrade />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/leaderboard') {
    return (
      <ProtectedRoute>
        <Leaderboard />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/profile') {
    return (
      <ProtectedRoute>
        <ProfileEdit />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/membership') {
    return (
      <ProtectedRoute>
        <Membership />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/support') {
    return (
      <ProtectedRoute>
        <ContactSupport />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/admin-portal') {
    return (
      <ProtectedRoute requireAdmin>
        <AdminPortal />
      </ProtectedRoute>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (effectiveRole === 'admin') {
    return (
      <ProtectedRoute requireAdmin>
        <AdminPortal />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <StudentDashboard />
    </ProtectedRoute>
  );
}

function App() {
  return <AppContent />;
}

export default App;
