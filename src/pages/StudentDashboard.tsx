import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
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
} from 'lucide-react';
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

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
      <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-[100] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <BrandLogo variant="nav" className="w-8 h-8 sm:w-10 sm:h-10 bg-white/5 ring-1 ring-white/10 shadow-md shrink-0" />
              <span className="text-base sm:text-xl font-bold text-white truncate">Railway Study Point</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/leaderboard')}
                  className="text-gray-300 hover:text-white text-xs sm:text-sm flex items-center gap-1 transition"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="hidden md:inline">Leaderboard</span>
                </button>
                {effectiveRole === 'admin' && (
                  <button
                    type="button"
                    onClick={() => navigate('/admin-portal')}
                    className="text-gray-300 hover:text-white text-xs sm:text-sm flex items-center gap-1 transition"
                  >
                    <Shield className="w-4 h-4 text-red-400" />
                    <span className="hidden md:inline">Admin</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-3">
                {isPremium ? (
                  <div className="flex items-center gap-1 bg-yellow-600/20 text-yellow-500 border border-yellow-500/30 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                    <Crown className="w-3 h-3 sm:w-4 h-4" />
                    <span className="hidden xs:inline">Premium</span>
                    <span className="xs:hidden">Pro</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/upgrade')}
                    className="flex items-center gap-1 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-bold transition shadow-lg shadow-yellow-900/20"
                  >
                    <Crown className="w-3 h-3 sm:w-4 h-4" />
                    <span className="hidden xs:inline uppercase tracking-wider">Go Premium</span>
                    <span className="xs:hidden">Upgrade</span>
                  </button>
                )}

                <div className="relative" ref={settingsRef}>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen((o) => !o)}
                    className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition"
                    aria-expanded={settingsOpen}
                  >
                    <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  {settingsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-[150] py-2 text-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-700 mb-1">
                        <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-1">Signed in as</p>
                        <p className="text-white font-medium truncate">{profile?.full_name || 'Student'}</p>
                      </div>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-gray-200 hover:bg-gray-700 transition flex items-center gap-3"
                        onClick={() => {
                          setSettingsOpen(false);
                          navigate('/profile');
                        }}
                      >
                        <User className="w-4 h-4 text-blue-400" />
                        Profile
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-gray-200 hover:bg-gray-700 transition flex items-center gap-3"
                        onClick={() => {
                          setSettingsOpen(false);
                          navigate('/membership');
                        }}
                      >
                        <Crown className="w-4 h-4 text-yellow-400" />
                        Membership
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-gray-200 hover:bg-gray-700 transition flex items-center gap-3 sm:hidden"
                        onClick={() => {
                          setSettingsOpen(false);
                          navigate('/leaderboard');
                        }}
                      >
                        <Trophy className="w-4 h-4 text-amber-400" />
                        Leaderboard
                      </button>
                      {effectiveRole === 'admin' && (
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2.5 text-gray-200 hover:bg-gray-700 transition flex items-center gap-3 sm:hidden"
                          onClick={() => {
                            setSettingsOpen(false);
                            navigate('/admin-portal');
                          }}
                        >
                          <Shield className="w-4 h-4 text-red-400" />
                          Admin Portal
                        </button>
                      )}
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-gray-200 hover:bg-gray-700 transition flex items-center gap-3 border-t border-gray-700 mt-1"
                        onClick={() => {
                          setSettingsOpen(false);
                          navigate('/support');
                        }}
                      >
                        <Briefcase className="w-4 h-4 text-green-400" />
                        Contact Support
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-red-400 hover:bg-red-400/10 transition flex items-center gap-3"
                        onClick={handleSignOut}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {!selectedCategory ? (
          <>
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Choose Your Exam Category
              </h1>
              <p className="text-gray-400 text-sm sm:text-base">
                Select a category to start practicing
              </p>
              {effectiveRole !== 'admin' && !isPremium && daysLeftTrial !== null && (
                <div className="mt-4 bg-amber-600/10 border border-amber-500/20 rounded-xl p-3 sm:p-4 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-amber-400 text-xs sm:text-sm font-medium">
                    Free trial active: {daysLeftTrial} day{daysLeftTrial === 1 ? '' : 's'} left — you have full access to all tests.
                  </p>
                </div>
              )}
              {trialExpiredNeedsPremium && (
                <div className="mt-4 bg-orange-600/10 border border-orange-500/20 rounded-xl p-3 sm:p-4 flex items-center gap-3">
                  <Shield className="w-5 h-5 text-orange-500 shrink-0" />
                  <p className="text-orange-300 text-xs sm:text-sm">
                    Your free week is over. Upgrade to premium to unlock all exams and continue your journey.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className="bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-700 hover:border-gray-500 transition transform hover:scale-[1.02] active:scale-95 text-left group"
                  >
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center mb-4 group-hover:shadow-lg transition`}>
                      <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5">
                      {category.name}
                    </h3>
                    <p className="text-gray-400 text-xs sm:text-sm">
                      {category.description}
                    </p>
                    <div className="mt-4 flex items-center gap-1 text-blue-400 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition">
                      Explore Exams <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>
                );
              })}
            </div>

            {recentResults.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Recent Performance
                  </h2>
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <th className="px-4 sm:px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Date
                          </th>
                          <th className="px-4 sm:px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Score
                          </th>
                          <th className="px-4 sm:px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest hidden xs:table-cell">
                            Time
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {recentResults.map((result) => (
                          <tr key={result.id} className="hover:bg-gray-700/30 transition">
                            <td className="px-4 sm:px-6 py-4 text-gray-300 text-xs sm:text-sm">
                              {new Date(result.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 sm:px-6 py-4">
                              <div className="flex flex-col">
                                <span className={`font-bold text-sm sm:text-base ${
                                  (result.score / result.total_questions) * 100 >= 60
                                    ? 'text-green-400'
                                    : 'text-red-400'
                                }`}>
                                  {result.score}/{result.total_questions}
                                </span>
                                <div className="w-16 sm:w-24 h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      (result.score / result.total_questions) * 100 >= 60 ? 'bg-green-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${(result.score / result.total_questions) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-gray-400 text-xs sm:text-sm hidden xs:table-cell">
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
