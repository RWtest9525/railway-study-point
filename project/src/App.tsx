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
import { Settings } from './pages/Settings';
import { MockTests } from './pages/MockTests';
import { SubjectQuizzes } from './pages/SubjectQuizzes';
import { PreviousYearPapers } from './pages/PreviousYearPapers';
import { AdminPortal } from './pages/admin/AdminPortal';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentAnalytics } from './pages/admin/StudentAnalytics';

function AppContent() {
  const { currentPath, navigate } = useRouter();
  const { user, loading, effectiveRole, isBanned, signOut } = useAuth();
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

  if (currentPath === '/notifications') {
    return (
      <ProtectedRoute>
        <Notifications />
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

  if (currentPath === '/admin-portal') {
    return (
      <ProtectedRoute requireAdmin>
        <AdminPortal />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/admin/student-analytics') {
    return (
      <ProtectedRoute requireAdmin>
        <StudentAnalytics />
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
