import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Trophy, Medal, ArrowLeft, Crown } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useRouter } from '../contexts/RouterContext';

type Row = {
  user_id: string;
  full_name: string;
  total_score: number;
  exams_taken: number;
};

export function Leaderboard() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const { goBack } = useRouter();
  const isDark = theme === 'dark';
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Fetch all attempts from Firestore
        const attemptsRef = collection(db, 'attempts');
        const q = query(attemptsRef, orderBy('submitted_at', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setRows([]);
          setLoading(false);
          return;
        }

        // Aggregate scores by user
        const userStats: Record<string, { full_name: string; total_score: number; exams_taken: number; role: string }> = {};
        
        // Fetch profiles to get names
        const profilesData: Record<string, string> = {};
        
        for (const doc of snapshot.docs) {
          const data = doc.data();
          const userId = data.user_id;
          
          if (!userStats[userId]) {
            // Fetch profile if not cached
            if (!profilesData[userId]) {
              try {
                const profileRef = collection(db, 'profiles');
                const profileQuery = query(profileRef, where('__name__', '==', userId));
                const profileSnap = await getDocs(profileQuery);
                if (!profileSnap.empty) {
                  const profileData = profileSnap.docs[0].data();
                  profilesData[userId] = profileData.full_name || 'Student';
                } else {
                  profilesData[userId] = 'Student';
                }
              } catch (e) {
                profilesData[userId] = 'Student';
              }
            }
            
            userStats[userId] = {
              full_name: profilesData[userId],
              total_score: 0,
              exams_taken: 0,
              role: 'student', // Default role
            };
          }
          
          userStats[userId].total_score += data.score || 0;
          userStats[userId].exams_taken += 1;
        }

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
            onClick={() => goBack()}
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
              <div className="flex items-end justify-center gap-2 sm:gap-4 py-12 px-4 relative">
                {/* 2nd Place - Left */}
                <div className="flex flex-col items-center flex-1 max-w-[130px] animate-in slide-in-from-bottom duration-700">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-3 ${
                    isDark ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-100 shadow-[0_0_20px_rgba(148,163,184,0.3)]' : 'bg-gradient-to-br from-slate-200 to-slate-400 text-white shadow-[0_0_20px_rgba(148,163,184,0.5)]'
                  } border-2 border-white/20 relative z-10`}>
                    <Medal className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <p className={`text-xs sm:text-sm font-bold text-center truncate w-full px-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {rows[1].full_name}
                  </p>
                  <p className={`text-[10px] sm:text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {rows[1].total_score.toLocaleString()} pts
                  </p>
                  <div className={`w-full mt-4 rounded-t-2xl ${isDark ? 'bg-gradient-to-t from-slate-800 to-slate-700 border-t border-slate-600' : 'bg-gradient-to-t from-slate-200 to-slate-100 border-t border-white'} h-24 sm:h-32 flex items-start justify-center pt-3 shadow-2xl relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                    <span className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-slate-400 to-slate-500 drop-shadow-sm">2</span>
                  </div>
                </div>

                {/* 1st Place - Center (Tallest) */}
                <div className="flex flex-col items-center flex-1 max-w-[150px] relative z-20 animate-in slide-in-from-bottom duration-1000 zoom-in-95">
                  <div className="absolute -top-6 animate-bounce">
                    <Crown className="w-8 h-8 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
                  </div>
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-3 ${
                    isDark ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-amber-50 shadow-[0_0_30px_rgba(245,158,11,0.4)]' : 'bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-[0_0_30px_rgba(245,158,11,0.6)]'
                  } border-4 border-amber-200/30 relative z-10`}>
                    <Trophy className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <p className={`text-sm sm:text-base font-extrabold text-center truncate w-full px-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    {rows[0].full_name}
                    {profile?.id === rows[0].user_id && (
                      <span className="block text-[10px] uppercase font-bold tracking-widest mt-0.5 opacity-90 text-amber-500">You</span>
                    )}
                  </p>
                  <p className={`text-xs sm:text-sm font-bold ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>
                    {rows[0].total_score.toLocaleString()} pts
                  </p>
                  <div className={`w-full mt-4 rounded-t-2xl ${isDark ? 'bg-gradient-to-t from-amber-900 to-amber-700 border-t border-amber-500' : 'bg-gradient-to-t from-amber-400 to-amber-200 border-t border-white'} h-36 sm:h-44 flex items-start justify-center pt-3 shadow-2xl relative overflow-hidden`}>
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                    <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-amber-100 drop-shadow-md">1</span>
                  </div>
                </div>

                {/* 3rd Place - Right */}
                <div className="flex flex-col items-center flex-1 max-w-[130px] animate-in slide-in-from-bottom duration-700">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-3 ${
                    isDark ? 'bg-gradient-to-br from-orange-400 to-orange-700 text-orange-50 shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'bg-gradient-to-br from-orange-300 to-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.5)]'
                  } border-2 border-white/20 relative z-10`}>
                    <Medal className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <p className={`text-xs sm:text-sm font-bold text-center truncate w-full px-2 ${isDark ? 'text-orange-200' : 'text-orange-700'}`}>
                    {rows[2].full_name}
                  </p>
                  <p className={`text-[10px] sm:text-xs font-semibold ${isDark ? 'text-orange-400/80' : 'text-orange-600'}`}>
                    {rows[2].total_score.toLocaleString()} pts
                  </p>
                  <div className={`w-full mt-4 rounded-t-2xl ${isDark ? 'bg-gradient-to-t from-orange-950 to-orange-900 border-t border-orange-800' : 'bg-gradient-to-t from-orange-200 to-orange-100 border-t border-white'} h-20 sm:h-24 flex items-start justify-center pt-3 shadow-2xl relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                    <span className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-orange-500 to-orange-600 drop-shadow-sm">3</span>
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
                <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
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
