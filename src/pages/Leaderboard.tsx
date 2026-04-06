import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Trophy, ArrowLeft } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';

type Row = {
  user_id: string;
  full_name: string;
  total_score: number;
  exams_taken: number;
};

export function Leaderboard() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // 1. Try RPC first (Efficient)
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_leaderboard', { limit_n: 100 });
        
        if (!rpcError && rpcData) {
          const normalized = rpcData.map((r: any) => ({
            user_id: r.user_id,
            full_name: r.full_name || 'Student',
            total_score: Number(r.total_score),
            exams_taken: Number(r.exams_taken),
          }));
          setRows(normalized);
          setLoading(false);
          return;
        }

        // 2. Fallback: Manual aggregation (Resilient)
        console.warn('Leaderboard RPC missing or failed, using manual fallback');
        const { data: results, error: resError } = await supabase
          .from('results')
          .select('user_id, score, profiles:user_id(full_name)')
          .order('created_at', { ascending: false });

        if (resError) throw resError;

        if (!results || results.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }

        const userStats: Record<string, { full_name: string; total_score: number; exams_taken: number }> = {};
        
        results.forEach((r: any) => {
          const uid = r.user_id;
          if (!userStats[uid]) {
            userStats[uid] = {
              full_name: (r.profiles as any)?.full_name || 'Student',
              total_score: 0,
              exams_taken: 0,
            };
          }
          userStats[uid].total_score += (r.score || 0);
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
      } catch (e: any) {
        console.error('Leaderboard error:', e);
        setError('Leaderboard is currently unavailable. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Header with back arrow */}
      <header className={`${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white/95 border-gray-200'} sticky top-0 z-50 backdrop-blur-md border-b`}>
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => window.history.back()}
            className={`p-2 rounded-full transition ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <h1 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Leaderboard</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
          </div>
        )}

        {error && (
          <div className={`${isDark ? 'bg-red-900/40 border-red-600 text-red-200' : 'bg-red-100 border-red-300 text-red-700'} px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-3 border`}>
            <div className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className={`${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border p-12 text-center`}>
            <Trophy className={`w-12 h-12 mx-auto mb-4 opacity-20 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`${isDark ? 'text-gray-500' : 'text-gray-600'} text-sm`}>No results yet. Complete an exam to appear here!</p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border overflow-hidden shadow-2xl`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                  <tr>
                    <th className={`px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Rank</th>
                    <th className={`px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Student</th>
                    <th className={`px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest hidden xs:table-cell text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Exams</th>
                    <th className={`px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Score</th>
                  </tr>
                </thead>
                <tbody className={`${isDark ? 'divide-y divide-gray-700/50' : 'divide-y divide-gray-200'}`}>
                  {rows.map((r, i) => (
                    <tr
                      key={r.user_id}
                      className={`transition-colors ${
                        profile?.id === r.user_id 
                          ? (isDark ? 'bg-amber-500/10' : 'bg-amber-50') 
                          : (isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50')
                      }`}
                    >
                      <td className="px-4 sm:px-6 py-4">
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                          i === 0 ? 'bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/20' :
                          i === 1 ? 'bg-gray-300 text-gray-900' :
                          i === 2 ? 'bg-orange-400 text-orange-950' :
                          (isDark ? 'text-gray-500' : 'text-gray-400')
                        }`}>
                          {i + 1}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm sm:text-base font-medium truncate ${
                            profile?.id === r.user_id 
                              ? (isDark ? 'text-amber-400 font-bold' : 'text-amber-600 font-bold') 
                              : (isDark ? 'text-gray-200' : 'text-gray-700')
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
                        <span className={`text-xs sm:text-sm px-2 py-1 rounded-md border ${isDark ? 'text-gray-400 bg-gray-700/50 border-gray-600/30' : 'text-gray-500 bg-gray-100 border-gray-200'}`}>
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
      </main>
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
