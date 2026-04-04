import { useRouter } from './contexts/RouterContext';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { StudentDashboard } from './pages/StudentDashboard';
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
  const { currentPath } = useRouter();
  const { user, loading, effectiveRole } = useAuth();

  // HIGH PRIORITY: If we are logged in as an admin, show the Admin Portal regardless of the path (unless it's a specific action)
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
    // Admins can still visit specific student pages if they want, but default to AdminPortal
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
        <StudentDashboard />
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
