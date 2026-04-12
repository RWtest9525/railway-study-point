import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getAllAttempts, getUsers } from '../../lib/firestore';
import { Trophy, Medal, Award, TrendingUp, ChevronRight, X, Calendar, BookOpen, Repeat } from 'lucide-react';

interface LeaderboardEntry {
  userId: string;
  userName: string;
  email: string;
  totalAttempts: number;
  totalScore: number;
  avgScore: number;
  bestScore: number;
  // Detailed stats
  mainExamsWeek: number;
  mainExamsMonth: number;
  mainExamsYear: number;
  practiceWeek: number;
  practiceMonth: number;
  practiceYear: number;
  practiceReattempts: number;
  monthlyScore: number;
  monthlyRankPercentile: number;
}

export function AdminLeaderboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'exams' | 'category'>('exams');
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [filterType]);

  const loadLeaderboard = async () => {
    try {
      const attempts = await getAllAttempts();
      const users = await getUsers();
      
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      // Group attempts by user with full details
      const userStats = new Map<string, any>();
      
      attempts.forEach(attempt => {
        const userId = attempt.user_id;
        const submittedAt = new Date(attempt.submitted_at || now.toISOString());
        const isMain = !attempt.exam_id.startsWith('node_');
        
        let stats = userStats.get(userId);
        if (!stats) {
          const user: any = users.find((u: any) => u.id === userId);
          stats = {
             userName: user?.full_name || 'Unknown',
             email: user?.email || 'N/A',
             totalAttempts: 0, totalScore: 0, bestScore: 0,
             mainExamsWeek: 0, mainExamsMonth: 0, mainExamsYear: 0,
             practiceWeek: 0, practiceMonth: 0, practiceYear: 0,
             practiceTakes: new Map<string, number>(),
             practiceReattempts: 0,
             monthlyScore: 0
          };
          userStats.set(userId, stats);
        }
        
        if (isMain) {
           if (submittedAt >= weekAgo) stats.mainExamsWeek++;
           if (submittedAt >= monthAgo) { stats.mainExamsMonth++; stats.monthlyScore += attempt.score; }
           if (submittedAt >= yearAgo) stats.mainExamsYear++;
        } else {
           if (submittedAt >= weekAgo) stats.practiceWeek++;
           if (submittedAt >= monthAgo) stats.practiceMonth++;
           if (submittedAt >= yearAgo) stats.practiceYear++;
           
           const timesTaken = stats.practiceTakes.get(attempt.exam_id) || 0;
           if (timesTaken > 0) stats.practiceReattempts++;
           stats.practiceTakes.set(attempt.exam_id, timesTaken + 1);
        }
        
        const countsThis = filterType === 'exams' ? isMain : !isMain;
        if (countsThis) {
           stats.totalAttempts++;
           stats.totalScore += attempt.score;
           stats.bestScore = Math.max(stats.bestScore, attempt.score);
        }
      });

      // Calculate monthly rankings to determine Top X%
      const allMonthlyScores = Array.from(userStats.values())
        .map(s => s.monthlyScore)
        .filter(score => score > 0)
        .sort((a, b) => b - a);

      const entries: LeaderboardEntry[] = Array.from(userStats.entries()).map(([userId, stats]) => {
        // Calculate Top %
        let topPercentile = 100;
        if (stats.monthlyScore > 0 && allMonthlyScores.length > 0) {
           const rank = allMonthlyScores.findIndex(s => s <= stats.monthlyScore) + 1;
           topPercentile = Math.ceil((rank / allMonthlyScores.length) * 100);
        }

        return {
          userId,
          userName: stats.userName,
          email: stats.email,
          totalAttempts: stats.totalAttempts,
          totalScore: stats.totalScore,
          avgScore: stats.totalAttempts > 0 ? stats.totalScore / stats.totalAttempts : 0,
          bestScore: stats.bestScore,
          mainExamsWeek: stats.mainExamsWeek,
          mainExamsMonth: stats.mainExamsMonth,
          mainExamsYear: stats.mainExamsYear,
          practiceWeek: stats.practiceWeek,
          practiceMonth: stats.practiceMonth,
          practiceYear: stats.practiceYear,
          practiceReattempts: stats.practiceReattempts,
          monthlyScore: stats.monthlyScore,
          monthlyRankPercentile: topPercentile,
        };
      }).filter(e => e.totalAttempts > 0);

      // Sort by best score or average score
      entries.sort((a, b) => b.avgScore - a.avgScore);
      setLeaderboard(entries);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</div>;
  }

  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen p-6`}>
      <div className="mb-6">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Leaderboard</h1>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Overall exam score leaderboard. Updates automatically.</p>
      </div>

      <div className="flex gap-3 mb-8 max-w-sm">
        <button
          onClick={() => setFilterType('exams')}
          className={`flex-1 py-3 rounded-xl font-bold transition ${
            filterType === 'exams'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : isDark ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Main Exams
        </button>
        <button
          onClick={() => setFilterType('category')}
          className={`flex-1 py-3 rounded-xl font-bold transition ${
            filterType === 'category'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : isDark ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Practice Tests
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6`}>
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Students</span>
          </div>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{leaderboard.length}</p>
        </div>
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6`}>
          <div className="flex items-center gap-3 mb-2">
            <Medal className="w-6 h-6 text-blue-500" />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Attempts</span>
          </div>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {leaderboard.reduce((sum, e) => sum + e.totalAttempts, 0)}
          </p>
        </div>
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6`}>
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-green-500" />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Avg Score</span>
          </div>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {leaderboard.length > 0 
              ? (leaderboard.reduce((sum, e) => sum + e.avgScore, 0) / leaderboard.length).toFixed(1)
              : '0'
            }
          </p>
        </div>
      </div>

      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border overflow-hidden`}>
        <table className="w-full">
          <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Rank</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Student</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Attempts</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Avg Score</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-400">Best Score</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {leaderboard.map((entry, index) => (
              <tr key={entry.userId} className={`hover:${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <td className="px-6 py-4">
                  {index === 0 ? (
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      <span className="font-bold text-yellow-500">1</span>
                    </div>
                  ) : index === 1 ? (
                    <div className="flex items-center gap-2">
                      <Medal className="w-5 h-5 text-gray-400" />
                      <span className="font-bold text-gray-400">2</span>
                    </div>
                  ) : index === 2 ? (
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-600" />
                      <span className="font-bold text-amber-600">3</span>
                    </div>
                  ) : (
                    <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{index + 1}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{entry.userName}</div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{entry.email}</div>
                </td>
                <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{entry.totalAttempts}</td>
                <td className="px-6 py-4">
                  <span className="font-bold text-green-400">{entry.avgScore.toFixed(1)}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-3">
                    <span className="font-bold text-blue-400 text-lg mr-2">{entry.bestScore}</span>
                    <button 
                      onClick={() => setSelectedUser(entry)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                        isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700' : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 shadow-sm'
                      }`}
                    >
                      Details
                      <ChevronRight className="w-3 h-3 inline ml-1" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-lg overflow-hidden rounded-[24px] border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} shadow-2xl zoom-in-95`}>
            <div className={`flex justify-between items-center px-6 py-5 border-b ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
              <div>
                <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedUser.userName}</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{selectedUser.email}</p>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className={`p-2 rounded-full transition ${isDark ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Overall Monthly Rank */}
              <div className={`flex items-center justify-between p-4 rounded-2xl border ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>Monthly Rank</h4>
                    <p className={`text-xs ${isDark ? 'text-indigo-400/80' : 'text-indigo-600/80'} mt-0.5`}>Among all candidates</p>
                  </div>
                </div>
                <div className={`text-xl font-black ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  Top {selectedUser.monthlyRankPercentile}%
                </div>
              </div>

              {/* Main Exams Stats */}
              <div>
                <h4 className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <BookOpen className="w-4 h-4" /> Main Exams Attempted
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'} text-center`}>
                    <div className={`text-2xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedUser.mainExamsWeek}</div>
                    <div className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>This Week</div>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'} text-center`}>
                    <div className={`text-2xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedUser.mainExamsMonth}</div>
                    <div className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>This Month</div>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'} text-center`}>
                    <div className={`text-2xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedUser.mainExamsYear}</div>
                    <div className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>This Year</div>
                  </div>
                </div>
              </div>

              {/* Practice Tests Stats */}
              <div>
                <h4 className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Calendar className="w-4 h-4" /> Practice Tests Attempted
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'} text-center`}>
                    <div className={`text-2xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedUser.practiceWeek}</div>
                    <div className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>This Week</div>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'} text-center`}>
                    <div className={`text-2xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedUser.practiceMonth}</div>
                    <div className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>This Month</div>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'} text-center`}>
                    <div className={`text-2xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedUser.practiceYear}</div>
                    <div className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>This Year</div>
                  </div>
                </div>
              </div>

              <div className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-amber-500/20 text-amber-500' : 'bg-amber-100 text-amber-600'}`}>
                    <Repeat className="w-4 h-4" />
                  </div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Practice Re-attempts</span>
                </div>
                <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedUser.practiceReattempts} times</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
