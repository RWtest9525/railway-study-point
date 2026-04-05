import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from '../contexts/RouterContext';
import { useAuth } from '../contexts/AuthContext';
import { Trophy } from 'lucide-react';

type Row = {
  user_id: string;
  full_name: string;
  total_score: number;
  exams_taken: number;
};

export function Leaderboard() {
  const { navigate } = useRouter();
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_leaderboard', { limit_n: 100 });
        
        if (rpcError) {
          // Fallback if RPC fails or doesn't exist yet
          const { data: results, error: resError } = await supabase
            .from('results')
            .select('user_id, score, profiles(full_name)')
            .order('created_at', { ascending: false });

          if (resError) throw resError;

          const userStats: Record<string, { full_name: string; total_score: number; exams_taken: number }> = {};
          results?.forEach((r: any) => {
            const uid = r.user_id;
            if (!userStats[uid]) {
              userStats[uid] = {
                full_name: r.profiles?.full_name || 'Student',
                total_score: 0,
                exams_taken: 0,
              };
            }
            userStats[uid].total_score += r.score;
            userStats[uid].exams_taken += 1;
          });

          const sorted = Object.entries(userStats)
            .map(([id, stats]) => ({
              user_id: id,
              ...stats,
            }))
            .sort((a, b) => b.total_score - a.total_score)
            .slice(0, 100);

          setRows(sorted);
          return;
        }

        const normalized = (data ?? []).map((r) => ({
          user_id: r.user_id,
          full_name: r.full_name || 'Student',
          total_score: Number(r.total_score),
          exams_taken: Number(r.exams_taken),
        }));
        setRows(normalized);
      } catch (e) {
        console.error(e);
        setError(
          'Could not load leaderboard. Run the latest database migration in Supabase (includes get_leaderboard).'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 py-6 sm:py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-blue-400 hover:text-blue-300 mb-6 transition flex items-center gap-1 text-sm sm:text-base"
        >
          ← Back to Dashboard
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-900/20">
            <Trophy className="w-6 h-6 sm:w-10 sm:h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">Leaderboard</h1>
            <p className="text-gray-400 text-xs sm:text-base">Top performers across all exams</p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
          </div>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-600 text-red-200 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-12 text-center">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
            <p className="text-gray-500 text-sm">No results yet. Complete an exam to appear here!</p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Rank</th>
                    <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Student</th>
                    <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest hidden xs:table-cell text-center">Exams</th>
                    <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {rows.map((r, i) => (
                    <tr
                      key={r.user_id}
                      className={`hover:bg-gray-700/30 transition-colors ${
                        profile?.id === r.user_id ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      <td className="px-4 sm:px-6 py-4">
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                          i === 0 ? 'bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/20' :
                          i === 1 ? 'bg-gray-300 text-gray-900' :
                          i === 2 ? 'bg-orange-400 text-orange-950' :
                          'text-gray-500'
                        }`}>
                          {i + 1}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm sm:text-base font-medium truncate ${
                            profile?.id === r.user_id ? 'text-amber-400 font-bold' : 'text-gray-200'
                          }`}>
                            {r.full_name}
                          </span>
                          {profile?.id === r.user_id && (
                            <span className="bg-amber-500/20 text-amber-500 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center hidden xs:table-cell">
                        <span className="text-xs sm:text-sm text-gray-400 bg-gray-700/50 px-2 py-1 rounded-md border border-gray-600/30">
                          {r.exams_taken}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <span className="text-sm sm:text-lg font-bold text-amber-400 tabular-nums">
                          {r.total_score.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
