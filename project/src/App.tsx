import React, { useState, useEffect } from 'react';
import { useRouter } from './contexts/RouterContext';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ExamSelection } from './pages/ExamSelection';
import { SubjectSelection } from './pages/SubjectSelection';
import { ExamDetailSelection } from './pages/ExamDetailSelection';
import { ExamInterface } from './pages/ExamInterface';
import { Results } from './pages/Results';
import { Upgrade } from './pages/Upgrade';
import { Leaderboard } from './pages/Leaderboard';
import { ProfileEdit } from './pages/ProfileEdit';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Membership } from './pages/Membership';
import { ContactSupport } from './pages/ContactSupport';
import { Notifications } from './pages/Notifications';
import { PushNotificationsInfo } from './pages/PushNotificationsInfo';
import { Settings } from './pages/Settings';
import { MockTests } from './pages/MockTests';
import { SubjectQuizzes } from './pages/SubjectQuizzes';
import { PreviousYearPapers } from './pages/PreviousYearPapers';
import { History } from './pages/History';
import { AdminPortal } from './pages/admin/AdminPortal';
import { StudentAnalytics } from './pages/admin/StudentAnalytics';

function AppContent() {
  const { currentPath, navigate } = useRouter();
  const { user, loading, effectiveRole } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Handle post-login redirect
  React.useEffect(() => {
    if (user && !loading && !hasRedirected) {
      // If user is on login/signup page after successful auth, redirect them
      if (currentPath === '/login' || currentPath === '/signup') {
        if (effectiveRole === 'admin') {
          navigate('/admin-portal');
        } else {
          navigate('/dashboard');
        }
        setHasRedirected(true);
      }
    }
  }, [user, loading, currentPath, navigate, effectiveRole, hasRedirected]);

  // Handle loading timeout - if loading takes more than 10 seconds, show retry option
  React.useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 second timeout
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  // 1. BANNED CHECK removed: ProtectedRoute handles this securely and allows /support bypassing.
  // 2. ADMIN OVERRIDE
  const isAdmin = effectiveRole === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg mb-2">Loading Railway Study Point...</p>
          {loadingTimeout && (
            <div className="mt-4">
              <p className="text-gray-400 text-sm mb-3">Taking longer than expected?</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
              >
                Reload Page
              </button>
            </div>
          )}
        </div>
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

  const isAdminRoute =
    currentPath === '/admin' ||
    currentPath === '/admin-portal' ||
    currentPath.startsWith('/admin/');

  // ADMIN OVERRIDE: If admin, prioritize Admin Portal
  if (isAdmin) {
    if (
      currentPath === '/dashboard' ||
      currentPath === '/' ||
      currentPath === '/admin' ||
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
        <ExamDetailSelection categoryId={categoryId} />
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

  if (currentPath === '/history') {
    return (
      <ProtectedRoute>
        <History />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/notifications') {
    return (
      <ProtectedRoute>
        <Notifications />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/notifications/push') {
    return (
      <ProtectedRoute>
        <PushNotificationsInfo />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/settings') {
    return (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    );
  }

  if (currentPath.startsWith('/mock-tests/')) {
    return (
      <ProtectedRoute>
        <MockTests />
      </ProtectedRoute>
    );
  }

  if (currentPath.startsWith('/subject-quizzes/')) {
    return (
      <ProtectedRoute>
        <SubjectQuizzes />
      </ProtectedRoute>
    );
  }

  if (currentPath.startsWith('/previous-year-papers/')) {
    return (
      <ProtectedRoute>
        <PreviousYearPapers />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/admin' || currentPath === '/admin-portal') {
    return (
      <ProtectedRoute requireAdmin>
        <AdminPortal />
      </ProtectedRoute>
    );
  }

  if (currentPath.startsWith('/admin/student-analytics')) {
    return (
      <ProtectedRoute requireAdmin>
        <StudentAnalytics />
      </ProtectedRoute>
    );
  }

  if (effectiveRole === 'admin') {
    if (isAdminRoute) {
      return (
        <ProtectedRoute requireAdmin>
          <AdminPortal />
        </ProtectedRoute>
      );
    }
    return (
      <ProtectedRoute requireAdmin>
        <AdminPortal />
      </ProtectedRoute>
    );
  }

  return <Login />;
}

function App() {
  return <AppContent />;
}

export default App;
