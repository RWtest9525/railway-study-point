import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { getExams, getAttempts, Exam, QuizAttempt } from '../lib/firestore';
import {
  Brain as Train,
  Briefcase,
  Users,
  Crown,
  LogOut,
  Trophy,
  Clock,
  Shield,
  Settings,
  User,
  ChevronRight,
  Bell,
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { trialWholeDaysLeft } from '../lib/authUtils';

export function StudentDashboard() {
  const { profile, signOut, isPremium, effectiveRole, canAccessTests, trialExpiredNeedsPremium } =
    useAuth();
  const { navigate } = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [recentResults, setRecentResults] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const daysLeftTrial = useMemo(() => trialWholeDaysLeft(profile), [profile]);


  useEffect(() => {
    loadRecentResults();
  }, [profile?.id]);

  useEffect(() => {
    if (selectedCategory) {
      loadExams(selectedCategory);
    }
  }, [selectedCategory]);

  const loadRecentResults = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    try {
      const attempts = await getAttempts(profile.id);
      setRecentResults(attempts.slice(0, 5));
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExams = async (categoryId: string) => {
    try {
      const allExams = await getExams();
      const filteredExams = allExams.filter(exam => exam.category_id === categoryId);
      setExams(filteredExams);
    } catch (error) {
      console.error('Error loading exams:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const categories = [
    {
      id: 'alp',
      name: 'Assistant Loco Pilot',
      icon: Train,
      color: 'from-blue-600 to-blue-800',
      description: 'Technical & General Awareness',
    },
    {
      id: 'ntpc',
      name: 'Non-Technical Popular Categories',
      icon: Briefcase,
      color: 'from-green-600 to-green-800',
      description: 'Graduate & Undergraduate Level',
    },
    {
      id: 'group-d',
      name: 'Group D',
      icon: Users,
      color: 'from-orange-600 to-orange-800',
      description: 'Track Maintainer & Helper Posts',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-[100] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <BrandLogo variant="nav" className="w-8 h-8 sm:w-10 sm:h-10 bg-white/5 ring-1 ring-white/10 shadow-md shrink-0" />
              <span className="text-base sm:text-xl font-bold text-white truncate">Railway Study Point</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-4">
              <button
                type="button"
                onClick={() => navigate('/notifications')}
                className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition"
              >
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {!selectedCategory ? (
          <>
            {/* Hero Section */}
            <div className="mb-8">
              <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                      Welcome to Railway Study Point
                    </h1>
                    <p className="text-blue-200 text-lg mb-6">
                      Your complete preparation platform for railway exams. Practice tests, mock exams, and detailed analysis to help you succeed.
                    </p>
                    
                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-3 mb-6">
                      {effectiveRole !== 'admin' && !isPremium && daysLeftTrial !== null && (
                        <div className="bg-amber-600/20 border border-amber-500/30 rounded-full px-4 py-2 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-300 text-sm font-medium">
                            Trial: {daysLeftTrial} day{daysLeftTrial === 1 ? '' : 's'} left
                          </span>
                        </div>
                      )}
                      {isPremium && (
                        <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-full px-4 py-2 flex items-center gap-2">
                          <Crown className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-300 text-sm font-medium">
                            Premium Member
                          </span>
                        </div>
                      )}
                      {trialExpiredNeedsPremium && (
                        <div className="bg-orange-600/20 border border-orange-500/30 rounded-full px-4 py-2 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-orange-400" />
                          <span className="text-orange-300 text-sm font-medium">
                            Upgrade Required
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => navigate('/leaderboard')}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg"
                      >
                        View Leaderboard
                      </button>
                      {effectiveRole === 'admin' && (
                        <button
                          onClick={() => navigate('/admin-portal')}
                          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg"
                        >
                          Admin Portal
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="hidden lg:block text-right">
                    <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
                      <div className="text-4xl font-bold text-white mb-2">
                        {recentResults.length > 0 ? recentResults[0].score : '0'}
                      </div>
                      <div className="text-blue-200 text-sm">Latest Score</div>
                      {recentResults.length > 0 && (
                        <div className="mt-4 flex items-center justify-end gap-4 text-sm text-gray-300">
                          <span>Time: {Math.floor(recentResults[0].time_taken_seconds / 60)}m</span>
                          <span>Date: {new Date(recentResults[0].started_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
                    <Train className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Railway Exams</h3>
                    <p className="text-gray-400 text-sm">NTPC, Group D, ALP</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCategory('alp')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold transition"
                >
                  Explore Exams
                </button>
              </div>

              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-800 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">SSC & Banking</h3>
                    <p className="text-gray-400 text-sm">CGL, CHSL, Bank PO</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCategory('ntpc')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold transition"
                >
                  Explore Exams
                </button>
              </div>

              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-800 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Group D</h3>
                    <p className="text-gray-400 text-sm">Track Maintainer</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCategory('group-d')}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg font-semibold transition"
                >
                  Explore Exams
                </button>
              </div>
            </div>

            {/* Recent Performance */}
            {recentResults.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">Recent Performance</h2>
                  <Trophy className="w-6 h-6 text-amber-400" />
                </div>
                <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Exam</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Score</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {recentResults.map((result) => (
                          <tr key={result.id} className="hover:bg-gray-700/30 transition">
                            <td className="px-4 py-3 text-gray-300 text-sm">{new Date(result.started_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-gray-300 text-sm">Mock Test</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${
                                  (result.score / result.total_questions) * 100 >= 60 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {result.score}/{result.total_questions}
                                </span>
                                <div className="w-20 h-2 bg-gray-700 rounded-full">
                                  <div 
                                    className={`h-full rounded-full ${
                                      (result.score / result.total_questions) * 100 >= 60 ? 'bg-green-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${(result.score / result.total_questions) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-sm">
                              {Math.floor(result.time_taken_seconds / 60)}m {result.time_taken_seconds % 60}s
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Exam Categories */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Exam Categories</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-500 transition group text-left"
                    >
                      <div className={`w-14 h-14 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center mb-4 group-hover:shadow-lg transition`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition">
                        {category.name}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {category.description}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-blue-400 text-sm font-semibold">
                        View Exams <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-blue-400 hover:text-blue-300 mb-6 transition flex items-center gap-1 font-medium"
            >
              ← Back to Categories
            </button>

            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
                {categories.find((c) => c.id === selectedCategory)?.name}
                <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Exams</span>
              </h1>
              <p className="text-gray-400 text-sm sm:text-base">
                Choose an exam to start practicing
              </p>
              {trialExpiredNeedsPremium && (
                <div className="mt-4 bg-orange-600/10 border border-orange-500/20 rounded-xl p-4 flex items-center gap-3">
                  <Crown className="w-5 h-5 text-orange-500 shrink-0" />
                  <p className="text-orange-300 text-sm">
                    Tests are locked — upgrade to premium to continue.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-700 hover:border-gray-500 transition group flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition">
                      {exam.title}
                    </h3>
                    {exam.is_premium && (
                      <Crown className="w-5 h-5 text-yellow-500 shrink-0 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-400 mb-6">
                    <span className="flex items-center gap-1.5 bg-gray-700/50 px-2.5 py-1 rounded-md">
                      <Clock className="w-4 h-4 text-blue-400" />
                      {exam.duration_minutes} min
                    </span>
                    <span className="flex items-center gap-1.5 bg-gray-700/50 px-2.5 py-1 rounded-md">
                      <Users className="w-4 h-4 text-green-400" />
                      {exam.total_marks} marks
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!canAccessTests) {
                        navigate('/upgrade');
                        return;
                      }
                      if (exam.is_premium && !isPremium) {
                        navigate('/upgrade');
                        return;
                      }
                      navigate(`/exam/${exam.id}`);
                    }}
                    className={`w-full py-3 rounded-xl font-bold transition shadow-lg mt-auto ${
                      !canAccessTests || (exam.is_premium && !isPremium)
                        ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white shadow-yellow-900/20'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-900/20'
                    }`}
                  >
                    {!canAccessTests
                      ? 'Upgrade to continue'
                      : exam.is_premium && !isPremium
                        ? 'Unlock with Premium'
                        : 'Start Exam'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}