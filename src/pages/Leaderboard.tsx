import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Trophy, Medal, ArrowLeft } from 'lucide-react';
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
          // Filter out admins from leaderboard
          const filtered = rpcData.filter((r: any) => r.role !== 'admin');
          const normalized = filtered.map((r: any) => ({
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
          .select('user_id, score, profiles:user_id(full_name, role)')
          .order('created_at', { ascending: false });

        if (resError) throw resError;

        if (!results || results.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }

        const userStats: Record<string, { full_name: string; total_score: number; exams_taken: number; role: string }> = {};
        
        results.forEach((r: any) => {
          const uid = r.user_id;
          if (!userStats[uid]) {
            userStats[uid] = {
              full_name: (r.profiles as any)?.full_name || 'Student',
              total_score: 0,
              exams_taken: 0,
              role: (r.profiles as any)?.role || 'student',
            };
          }
          userStats[uid].total_score += (r.score || 0);
          userStats[uid].exams_taken += 1;
        });

        // Filter out admins and sort
        const sorted = Object.entries(userStats)
          .filter(([_, stats]) => stats.role !== 'admin')
          .map(([id, stats]) => ({
            user_id: id,
            full_name: stats.full_name,
            total_score: stats.total_score,
            exams_taken: stats.exams_taken,
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
          <div className="space-y-6">
            {/* Top 3 Podium/Stairs Display */}
            {rows.length >= 3 && (
              <div className="flex items-end justify-center gap-3 sm:gap-6 py-8 px-4">
                {/* 2nd Place - Left */}
                <div className="flex flex-col items-center flex-1 max-w-[120px]">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-2 ${
                    isDark ? 'bg-gray-300 text-gray-900' : 'bg-gray-300 text-gray-900'
                  } shadow-lg`}>
                    <Medal className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <p className={`text-xs sm:text-sm font-bold text-center truncate w-full ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {rows[1].full_name}
                  </p>
                  <p className={`text-[10px] sm:text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {rows[1].total_score.toLocaleString()} pts
                  </p>
                  <div className={`w-full mt-3 rounded-t-xl ${isDark ? 'bg-gray-300' : 'bg-gray-300'} h-20 sm:h-28 flex items-start justify-center pt-2`}>
                    <span className="text-2xl sm:text-3xl font-bold text-gray-700">2</span>
                  </div>
                </div>

                {/* 1st Place - Center (Tallest) */}
                <div className="flex flex-col items-center flex-1 max-w-[140px]">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-2 ${
                    isDark ? 'bg-amber-400 text-amber-950' : 'bg-amber-400 text-amber-950'
                  } shadow-xl shadow-amber-400/30`}>
                    <Trophy className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <p className={`text-sm sm:text-base font-bold text-center truncate w-full ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    {rows[0].full_name}
                    {profile?.id === rows[0].user_id && (
                      <span className="block text-[10px] font-normal opacity-75">You</span>
                    )}
                  </p>
                  <p className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    {rows[0].total_score.toLocaleString()} pts
                  </p>
                  <div className={`w-full mt-3 rounded-t-xl ${isDark ? 'bg-gradient-to-t from-amber-500 to-amber-400' : 'bg-gradient-to-t from-amber-400 to-amber-300'} h-28 sm:h-36 flex items-start justify-center pt-2 shadow-lg`}>
                    <span className="text-3xl sm:text-4xl font-bold text-amber-900">1</span>
                  </div>
                </div>

                {/* 3rd Place - Right */}
                <div className="flex flex-col items-center flex-1 max-w-[120px]">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-2 ${
                    isDark ? 'bg-orange-400 text-orange-950' : 'bg-orange-400 text-orange-950'
                  } shadow-lg`}>
                    <Medal className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <p className={`text-xs sm:text-sm font-bold text-center truncate w-full ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {rows[2].full_name}
                  </p>
                  <p className={`text-[10px] sm:text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {rows[2].total_score.toLocaleString()} pts
                  </p>
                  <div className={`w-full mt-3 rounded-t-xl ${isDark ? 'bg-orange-400' : 'bg-orange-400'} h-14 sm:h-20 flex items-start justify-center pt-2`}>
                    <span className="text-xl sm:text-2xl font-bold text-orange-950">3</span>
                  </div>
                </div>
              </div>
            )}

            {/* Handle cases with less than 3 users */}
            {rows.length === 1 && (
              <div className="flex flex-col items-center py-12">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                  isDark ? 'bg-amber-400 text-amber-950' : 'bg-amber-400 text-amber-950'
                } shadow-xl`}>
                  <Trophy className="w-10 h-10" />
                </div>
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {rows[0].full_name}
                </p>
                <p className={`text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  {rows[0].total_score.toLocaleString()} pts
                </p>
              </div>
            )}

            {rows.length === 2 && (
              <div className="flex items-end justify-center gap-6 py-8 px-4">
                <div className="flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
                    isDark ? 'bg-amber-400 text-amber-950' : 'bg-amber-400 text-amber-950'
                  } shadow-xl`}>
                    <Trophy className="w-8 h-8" />
                  </div>
                  <p className={`text-sm font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    {rows[0].full_name}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {rows[0].total_score.toLocaleString()} pts
                  </p>
                  <div className={`w-32 rounded-t-xl ${isDark ? 'bg-amber-400' : 'bg-amber-400'} h-28 flex items-start justify-center pt-2`}>
                    <span className="text-3xl font-bold text-amber-900">1</span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    isDark ? 'bg-gray-300 text-gray-900' : 'bg-gray-300 text-gray-900'
                  } shadow-lg`}>
                    <Medal className="w-6 h-6" />
                  </div>
                  <p className={`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {rows[1].full_name}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {rows[1].total_score.toLocaleString()} pts
                  </p>
                  <div className={`w-24 rounded-t-xl ${isDark ? 'bg-gray-300' : 'bg-gray-300'} h-16 flex items-start justify-center pt-2`}>
                    <span className="text-2xl font-bold text-gray-700">2</span>
                  </div>
                </div>
              </div>
            )}

            {/* Rest of the leaderboard (4th place onwards) */}
            {rows.length > 3 && (
              <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border overflow-hidden shadow-lg`}>
                <div className={`px-4 py-3 ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    More Rankings
                  </h3>
                </div>
                <div className="divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}">
                  {rows.slice(3).map((r, i) => {
                    const actualRank = i + 4;
                    return (
                      <div
                        key={r.user_id}
                        className={`flex items-center px-4 py-3 transition-colors ${
                          profile?.id === r.user_id 
                            ? (isDark ? 'bg-amber-500/10' : 'bg-amber-50') 
                            : (isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50')
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {actualRank}
                        </div>
                        <div className="flex-1 ml-3 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium truncate ${
                              profile?.id === r.user_id 
                                ? (isDark ? 'text-amber-400 font-bold' : 'text-amber-600 font-bold') 
                                : (isDark ? 'text-gray-200' : 'text-gray-700')
                            }`}>
                              {r.full_name}
                            </span>
                            {profile?.id === r.user_id && (
                              <span className="bg-amber-500/20 text-amber-500 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs px-2 py-1 rounded ${isDark ? 'text-gray-400 bg-gray-700/50' : 'text-gray-500 bg-gray-100'}`}>
                            {r.exams_taken} exams
                          </span>
                          <span className={`text-sm font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                            {r.total_score.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
