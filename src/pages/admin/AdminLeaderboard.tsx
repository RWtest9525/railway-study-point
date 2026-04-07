import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { Trophy, Medal, BookOpen, TrendingUp, Users, Search, Filter, Clock } from 'lucide-react';

type UserLearningStats = {
  user_id: string;
  full_name: string;
  email: string;
  total_score: number;
  exams_taken: number;
  correct_answers: number;
  total_questions: number;
  accuracy: number;
  avg_score: number;
  last_exam_date: string;
};

export function AdminLeaderboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [stats, setStats] = useState<UserLearningStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'exams' | 'accuracy'>('score');

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      // Get all users with their stats
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .neq('role', 'admin')
        .neq('role', 'banned');

      if (profileError) throw profileError;

      // Get results for all users - try with all columns first
      let results = null;
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select('user_id, score, created_at');

      if (resultsError) {
        console.warn('Error loading results:', resultsError);
        // If there's an error, try without optional columns
        const { data: fallbackData } = await supabase
          .from('results')
          .select('user_id, score')
          .limit(1000);
        results = fallbackData;
      } else {
        results = resultsData;
      }

      // Calculate stats for each user
      const userStatsMap: Record<string, UserLearningStats> = {};

      // Initialize all users
      profiles?.forEach(profile => {
        userStatsMap[profile.id] = {
          user_id: profile.id,
          full_name: profile.full_name || 'User',
          email: profile.email,
          total_score: 0,
          exams_taken: 0,
          correct_answers: 0,
          total_questions: 0,
          accuracy: 0,
          avg_score: 0,
          last_exam_date: profile.created_at,
        };
      });

      // Aggregate results
      results?.forEach((result: any) => {
        const userId = result.user_id;
        if (userStatsMap[userId]) {
          userStatsMap[userId].total_score += result.score || 0;
          userStatsMap[userId].exams_taken += 1;
          // Use available data for accuracy calculation
          if (result.correct_answers !== undefined) {
            userStatsMap[userId].correct_answers += result.correct_answers || 0;
          }
          if (result.total_questions !== undefined) {
            userStatsMap[userId].total_questions += result.total_questions || 0;
          }
          if (result.created_at && result.created_at > userStatsMap[userId].last_exam_date) {
            userStatsMap[userId].last_exam_date = result.created_at;
          }
        }
      });

      // Calculate accuracy and average score
      Object.values(userStatsMap).forEach(stats => {
        // If we don't have detailed data, estimate accuracy based on score
        if (stats.total_questions > 0) {
          stats.accuracy = (stats.correct_answers / stats.total_questions) * 100;
        } else {
          // Estimate: assume score is percentage of correct answers
          stats.accuracy = Math.min(stats.total_score / stats.exams_taken, 100);
        }
        stats.avg_score = stats.exams_taken > 0 
          ? stats.total_score / stats.exams_taken 
          : 0;
      });

      // Convert to array and sort
      const sortedStats = Object.values(userStatsMap)
        .sort((a, b) => {
          if (sortBy === 'score') return b.total_score - a.total_score;
          if (sortBy === 'accuracy') return b.accuracy - a.accuracy;
          return b.exams_taken - a.exams_taken;
        });

      setStats(sortedStats);
    } catch (err: any) {
      console.error('Error loading admin leaderboard:', err);
      setError('Failed to load leaderboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredStats = stats.filter(stat => 
    stat.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stat.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalExams = stats.reduce((sum, stat) => sum + stat.exams_taken, 0);
  const avgAccuracy = stats.length > 0 
    ? stats.reduce((sum, stat) => sum + stat.accuracy, 0) / stats.length 
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-3`}>
            <Trophy className={`w-8 h-8 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            Learning Leaderboard
          </h2>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm mt-1`}>
            Track user learning progress and performance
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 border ${isDark ? '' : 'shadow-lg'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {stats.length}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Active Learners</p>
            </div>
          </div>
        </div>
        
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 border ${isDark ? '' : 'shadow-lg'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {totalExams}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Exams Taken</p>
            </div>
          </div>
        </div>
        
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 border ${isDark ? '' : 'shadow-lg'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {avgAccuracy.toFixed(1)}%
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Avg Accuracy</p>
            </div>
          </div>
        </div>
        
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 border ${isDark ? '' : 'shadow-lg'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600/20 rounded-lg flex items-center justify-center">
              <Medal className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {stats.reduce((sum, s) => sum + s.total_score, 0).toLocaleString()}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Score</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 border ${isDark ? '' : 'shadow-lg'}`}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-gray-700 text-white border-gray-600' 
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-gray-700 text-white border-gray-600' 
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
            >
              <option value="score">Sort by Score</option>
              <option value="exams">Sort by Exams Taken</option>
              <option value="accuracy">Sort by Accuracy</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border overflow-hidden ${isDark ? '' : 'shadow-lg'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Rank</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Student</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'} hidden md:table-cell`}>Exams Taken</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'} hidden lg:table-cell`}>Accuracy</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Score</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'} hidden sm:table-cell`}>Last Active</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700/50' : 'divide-gray-200'}`}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`px-6 py-12 text-center ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredStats.map((stat, index) => {
                  const rank = index + 1;
                  return (
                    <tr key={stat.user_id} className={`${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'} transition`}>
                      <td className="px-6 py-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          rank === 1 ? 'bg-amber-500 text-amber-950' :
                          rank === 2 ? 'bg-gray-300 text-gray-900' :
                          rank === 3 ? 'bg-orange-400 text-orange-950' :
                          isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {rank}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {stat.full_name}
                            </span>
                            {rank <= 3 && (
                              <Medal className={`w-4 h-4 ${
                                rank === 1 ? 'text-amber-500' :
                                rank === 2 ? 'text-gray-400' :
                                'text-orange-500'
                              }`} />
                            )}
                          </div>
                          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                            {stat.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <BookOpen className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                          <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {stat.exams_taken}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-600 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                stat.accuracy >= 80 ? 'bg-green-500' :
                                stat.accuracy >= 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(stat.accuracy, 100)}%` }}
                            />
                          </div>
                          <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'} text-sm`}>
                            {stat.accuracy.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                          {stat.total_score.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <Clock className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                          <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
                            {new Date(stat.last_exam_date).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}