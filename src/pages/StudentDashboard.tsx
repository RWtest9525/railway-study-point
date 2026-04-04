import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Brain as Train, Briefcase, Users, Crown, LogOut, Trophy, Clock, User, Shield } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { trialWholeDaysLeft } from '../lib/authUtils';

type Exam = Database['public']['Tables']['exams']['Row'];
type Result = Database['public']['Tables']['results']['Row'];

export function StudentDashboard() {
  const { profile, signOut, isPremium, effectiveRole, canAccessTests, trialExpiredNeedsPremium } =
    useAuth();
  const { navigate } = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentResults();
  }, [profile?.id]);

  useEffect(() => {
    if (selectedCategory === 'ALP' || selectedCategory === 'NTPC' || selectedCategory === 'Group-D') {
      loadExams(selectedCategory);
    }
  }, [selectedCategory]);

  const loadRecentResults = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('results')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentResults(data || []);
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExams = async (category: 'ALP' | 'NTPC' | 'Group-D') => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      console.error('Error loading exams:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const daysLeftTrial = useMemo(() => trialWholeDaysLeft(profile), [profile]);

  const categories = [
    {
      id: 'ALP',
      name: 'Assistant Loco Pilot',
      icon: Train,
      color: 'from-blue-600 to-blue-800',
      description: 'Technical & General Awareness',
    },
    {
      id: 'NTPC',
      name: 'Non-Technical Popular Categories',
      icon: Briefcase,
      color: 'from-green-600 to-green-800',
      description: 'Graduate & Undergraduate Level',
    },
    {
      id: 'Group-D',
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
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 min-w-0">
              <BrandLogo variant="nav" className="bg-white/5 ring-2 ring-white/15 shadow-md" />
              <span className="text-xl font-bold text-white truncate">Railway Study Point</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => navigate('/leaderboard')}
                className="text-gray-300 hover:text-white text-sm flex items-center gap-1"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                Leaderboard
              </button>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="text-gray-300 hover:text-white text-sm flex items-center gap-1"
              >
                <User className="w-4 h-4 text-blue-400" />
                Profile
              </button>
              {effectiveRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => navigate('/admin-portal')}
                  className="text-gray-300 hover:text-white text-sm flex items-center gap-1"
                >
                  <Shield className="w-4 h-4 text-red-400" />
                  Admin
                </button>
              )}
              <span className="text-gray-300">
                Hello, {profile?.full_name || 'Student'}
              </span>
              {isPremium ? (
                <span className="flex flex-col items-end gap-0.5">
                  <span className="flex items-center gap-1 bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    <Crown className="w-4 h-4" />
                    Premium
                  </span>
                  {profile?.premium_until && (
                    <span className="text-xs text-gray-500">
                      until {new Date(profile.premium_until).toLocaleDateString()}
                    </span>
                  )}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/upgrade')}
                  className="flex items-center gap-1 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white px-4 py-2 rounded-lg font-semibold transition"
                >
                  <Crown className="w-4 h-4" />
                  Go Premium
                </button>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="text-gray-300 hover:text-white transition"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedCategory ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                Choose Your Exam Category
              </h1>
              <p className="text-gray-400">
                Select a category to start practicing
              </p>
              {effectiveRole !== 'admin' && !isPremium && daysLeftTrial !== null && (
                <p className="mt-3 text-amber-400 text-sm font-medium">
                  Free trial: {daysLeftTrial} day{daysLeftTrial === 1 ? '' : 's'} left — then upgrade to
                  keep taking tests.
                </p>
              )}
              {trialExpiredNeedsPremium && (
                <p className="mt-3 text-orange-300 text-sm">
                  Your free week is over. You can still use Leaderboard and Profile. Upgrade to take new
                  tests.
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className="bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition transform hover:scale-105"
                  >
                    <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center mb-4`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {category.name}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {category.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {recentResults.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  Recent Results
                </h2>
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                          Time Taken
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {recentResults.map((result) => (
                        <tr key={result.id} className="hover:bg-gray-700/50">
                          <td className="px-6 py-4 text-gray-300">
                            {new Date(result.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-semibold ${
                              (result.score / result.total_questions) * 100 >= 60
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}>
                              {result.score}/{result.total_questions}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                            {Math.floor(result.time_taken_seconds / 60)}m {result.time_taken_seconds % 60}s
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-blue-400 hover:text-blue-300 mb-6 transition"
            >
              ← Back to Categories
            </button>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                {categories.find((c) => c.id === selectedCategory)?.name} Exams
              </h1>
              <p className="text-gray-400">
                Choose an exam to start practicing
              </p>
              {trialExpiredNeedsPremium && (
                <p className="mt-2 text-orange-300 text-sm">
                  Tests are locked — upgrade to premium to continue.
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-white">
                      {exam.title}
                    </h3>
                    {exam.is_premium && (
                      <Crown className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {exam.duration_minutes} min
                    </span>
                    <span>
                      {(exam.question_ids as string[]).length} questions
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
                    className={`w-full py-2 rounded-lg font-semibold transition ${
                      !canAccessTests || (exam.is_premium && !isPremium)
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {!canAccessTests
                      ? 'Upgrade to continue'
                      : exam.is_premium && !isPremium
                        ? 'Upgrade to Access'
                        : 'Start Exam'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
