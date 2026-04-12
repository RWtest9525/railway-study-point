import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getAllAttempts, getUsers } from '../../lib/firestore';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';

interface LeaderboardEntry {
  userId: string;
  userName: string;
  email: string;
  totalAttempts: number;
  totalScore: number;
  avgScore: number;
  bestScore: number;
}

export function AdminLeaderboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'exams' | 'category'>('exams');

  useEffect(() => {
    loadLeaderboard();
  }, [filterType]);

  const loadLeaderboard = async () => {
    try {
      const attempts = await getAllAttempts();
      const users = await getUsers();
      
      // Group attempts by user
      const userStats = new Map<string, { totalAttempts: number; totalScore: number; bestScore: number; userName: string; email: string }>();
      
      const filteredAttempts = attempts.filter(att => 
        filterType === 'exams' ? !att.exam_id.startsWith('node_') : att.exam_id.startsWith('node_')
      );

      filteredAttempts.forEach(attempt => {
        const userId = attempt.user_id;
        const existing = userStats.get(userId);
        
        if (existing) {
          existing.totalAttempts++;
          existing.totalScore += attempt.score;
          existing.bestScore = Math.max(existing.bestScore, attempt.score);
        } else {
          const user: any = users.find((u: any) => u.id === userId);
          userStats.set(userId, {
            totalAttempts: 1,
            totalScore: attempt.score,
            bestScore: attempt.score,
            userName: user?.full_name || 'Unknown',
            email: user?.email || 'N/A',
          });
        }
      });

      // Convert to array and calculate averages
      const entries: LeaderboardEntry[] = Array.from(userStats.entries()).map(([userId, stats]) => ({
        userId,
        userName: stats.userName,
        email: stats.email,
        totalAttempts: stats.totalAttempts,
        totalScore: stats.totalScore,
        avgScore: stats.totalScore / stats.totalAttempts,
        bestScore: stats.bestScore,
      }));

      // Sort by average score
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
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Student</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Attempts</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Avg Score</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Best Score</th>
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
                  <span className="font-bold text-blue-400">{entry.bestScore}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
