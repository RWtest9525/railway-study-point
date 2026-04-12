import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Trophy, Medal, ArrowLeft, Crown, X, UserRound, GraduationCap, Percent } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useRouter } from '../contexts/RouterContext';

type Row = {
  user_id: string;
  full_name: string;
  avatarUrl?: string;
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
  const [filterType, setFilterType] = useState<'exams' | 'category'>('exams');
  const [selectedUser, setSelectedUser] = useState<Row | null>(null);

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
        const userStats: Record<string, { full_name: string; avatarUrl: string; total_score: number; exams_taken: number; role: string }> = {};
        
        // Fetch profiles to get names
        const profilesData: Record<string, { full_name: string, avatarUrl: string }> = {};
        
        const filteredDocs = snapshot.docs.filter(doc => {
          const examId = doc.data().exam_id || '';
          return filterType === 'exams' ? !examId.startsWith('node_') : examId.startsWith('node_');
        });

        for (const doc of filteredDocs) {
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
                  profilesData[userId] = { 
                    full_name: profileData.full_name || 'Student', 
                    avatarUrl: profileData.avatarUrl || '' 
                  };
                } else {
                  profilesData[userId] = { full_name: 'Student', avatarUrl: '' };
                }
              } catch (e) {
                profilesData[userId] = { full_name: 'Student', avatarUrl: '' };
              }
            }
            
            userStats[userId] = {
              full_name: profilesData[userId].full_name,
              avatarUrl: profilesData[userId].avatarUrl,
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
            avatarUrl: stats.avatarUrl,
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
  }, [filterType]);

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

      <main className="max-w-3xl mx-auto px-4 py-8 pb-56">
        <div className="flex gap-2 mb-6 w-full max-w-sm mx-auto">
          <button
            onClick={() => setFilterType('exams')}
            className={`flex-1 py-2 text-sm rounded-lg font-bold transition ${
              filterType === 'exams'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                : isDark ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            Main Exams
          </button>
          <button
            onClick={() => setFilterType('category')}
            className={`flex-1 py-2 text-sm rounded-lg font-bold transition ${
              filterType === 'category'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                : isDark ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            Practice Tests
          </button>
        </div>

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
          <div className="mb-6 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 p-6 text-center text-amber-600/80 dark:text-amber-400/80">
            <p className="text-sm font-semibold uppercase tracking-widest">No results yet</p>
            <p className="mt-1 text-xs opacity-75">Be the first to claim a spot on the podium!</p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            
            {/* Scrollable Global Rankings List */}
            {rows.length > 0 && (
              <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border overflow-hidden shadow-lg`}>
                <div className={`px-4 py-3 ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
                  <h3 className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Global Rankings
                  </h3>
                  <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-md ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                    {rows.length} participants
                  </span>
                </div>
                <div className={`divide-y ${isDark ? 'divide-gray-700/50' : 'divide-gray-100'}`}>
                  {rows.map((r, i) => {
                    const actualRank = i + 1;
                    const percentile = (actualRank / rows.length) * 100;
                    
                    let badgeLabel = null;
                    let badgeColor = '';
                    if (actualRank === 1) {
                      badgeLabel = 'Top Performer';
                      badgeColor = 'bg-amber-500/20 text-amber-500 border-amber-500/20';
                    } else if (actualRank === 2 || actualRank === 3) {
                      badgeLabel = 'Podium';
                      badgeColor = 'bg-orange-500/20 text-orange-500 border-orange-500/20';
                    } else if (actualRank <= 10) {
                      // Just show the rank natively, no special badge for 4-10
                    } else if (percentile <= 1) {
                      badgeLabel = 'Top 1%';
                      badgeColor = 'bg-fuchsia-500/20 text-fuchsia-500 border-fuchsia-500/20';
                    } else if (percentile <= 10) {
                      badgeLabel = 'Top 10%';
                      badgeColor = 'bg-violet-500/20 text-violet-500 border-violet-500/20';
                    } else if (percentile <= 20) {
                      badgeLabel = 'Top 20%';
                      badgeColor = 'bg-blue-500/20 text-blue-500 border-blue-500/20';
                    } else if (percentile <= 50) {
                      badgeLabel = 'Top 50%';
                      badgeColor = 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
                    }

                      <button
                        key={r.user_id}
                        onClick={() => setSelectedUser(r)}
                        className={`w-full flex flex-col sm:flex-row sm:items-center px-4 py-3 transition-colors gap-3 sm:gap-0 text-left ${
                          profile?.id === r.user_id 
                            ? (isDark ? 'bg-amber-500/10' : 'bg-amber-50') 
                            : (isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50')
                        }`}
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {actualRank === 1 ? <Crown className="w-4 h-4 text-amber-500" /> : actualRank}
                          </div>
                          
                          {/* Avatar */}
                          <div className={`w-9 h-9 rounded-full overflow-hidden shrink-0 ml-3 border-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            {r.avatarUrl ? (
                              <img src={r.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                <UserRound className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>

                          <div className="ml-3 min-w-0 flex items-center gap-2 flex-wrap">
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
                            {badgeLabel && (
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${badgeColor} shrink-0`}>
                                {badgeLabel}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 pl-11 sm:pl-0">
                          <span className={`text-xs px-2 py-1 rounded ${isDark ? 'text-gray-400 bg-gray-700/50' : 'text-gray-500 bg-gray-100'}`}>
                            {r.exams_taken} exams
                          </span>
                          <span className={`text-sm font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                            {r.total_score.toLocaleString()} pts
                          </span>
                        </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            
            {/* Fixed Bottom Podium */}
            {rows.length > 0 && (
              <div className={`fixed bottom-[72px] sm:bottom-0 left-0 right-0 z-40 border-t ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} shadow-[0_-20px_30px_rgba(0,0,0,0.1)]`} style={{ height: '140px' }}>
                <div className="max-w-3xl mx-auto h-full flex items-end justify-center gap-2 px-4 pb-0 pt-2 relative">
                  
                  {/* 2nd Place */}
                  {rows[1] && (
                    <div className="flex-1 flex flex-col items-center justify-end relative h-full">
                      <button onClick={() => setSelectedUser(rows[1])} className="group flex flex-col items-center z-20 mb-2 hover:scale-105 transition-transform">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 flex items-center justify-center ${isDark ? 'border-gray-400 bg-gray-800' : 'border-slate-300 bg-white'}`}>
                          {rows[1].avatarUrl ? <img src={rows[1].avatarUrl} alt="2nd" className="w-full h-full object-cover" /> : <UserRound className="w-5 h-5 text-gray-400" />}
                        </div>
                        <p className={`text-[10px] sm:text-xs font-bold w-16 text-center truncate mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{rows[1].full_name.split(' ')[0]}</p>
                      </button>
                      <div className={`w-full rounded-t-xl ${isDark ? 'bg-gradient-to-t from-gray-700 to-gray-600' : 'bg-gradient-to-t from-slate-200 to-slate-100 border border-t-slate-300 border-x-slate-300'} h-[50px] flex justify-center pt-1 shadow-inner relative`}>
                        <span className="text-xl font-black text-white/50 mix-blend-overlay">2</span>
                      </div>
                    </div>
                  )}

                  {/* 1st Place */}
                  {rows[0] && (
                    <div className="flex-1 flex flex-col items-center justify-end relative h-full mb-[10px]">
                      <div className="absolute top-2 animate-bounce z-30">
                        <Crown className="w-5 h-5 text-amber-500" />
                      </div>
                      <button onClick={() => setSelectedUser(rows[0])} className="group flex flex-col items-center z-20 mb-2 mt-4 hover:scale-105 transition-transform">
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-[3px] border-amber-400 flex items-center justify-center ${isDark ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
                          {rows[0].avatarUrl ? <img src={rows[0].avatarUrl} alt="1st" className="w-full h-full object-cover" /> : <UserRound className="w-6 h-6 text-amber-500" />}
                        </div>
                        <p className={`text-[11px] sm:text-xs font-black w-20 text-center truncate mt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{rows[0].full_name.split(' ')[0]}</p>
                      </button>
                      <div className={`w-full rounded-t-xl ${isDark ? 'bg-gradient-to-t from-amber-700 to-amber-600' : 'bg-gradient-to-t from-amber-300 to-amber-200 border border-t-amber-400 border-x-amber-400'} h-[70px] flex justify-center pt-1 shadow-inner relative`}>
                        <span className="text-2xl font-black text-white/50 mix-blend-overlay">1</span>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {rows[2] && (
                    <div className="flex-1 flex flex-col items-center justify-end relative h-full">
                      <button onClick={() => setSelectedUser(rows[2])} className="group flex flex-col items-center z-20 mb-2 hover:scale-105 transition-transform">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 flex items-center justify-center ${isDark ? 'border-orange-500 bg-orange-900/30' : 'border-orange-300 bg-orange-50'}`}>
                          {rows[2].avatarUrl ? <img src={rows[2].avatarUrl} alt="3rd" className="w-full h-full object-cover" /> : <UserRound className="w-5 h-5 text-orange-400" />}
                        </div>
                        <p className={`text-[10px] sm:text-xs font-bold w-16 text-center truncate mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{rows[2].full_name.split(' ')[0]}</p>
                      </button>
                      <div className={`w-full rounded-t-xl ${isDark ? 'bg-gradient-to-t from-orange-800 to-orange-700' : 'bg-gradient-to-t from-orange-200 to-orange-100 border border-t-orange-300 border-x-orange-300'} h-[40px] flex justify-center pt-1 shadow-inner relative`}>
                        <span className="text-lg font-black text-white/50 mix-blend-overlay">3</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
            
          </div>
        )}
      </main>

      {/* Selected User Modal Overlay */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-[24px] overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border shadow-2xl zoom-in-95`}>
            
            <div className={`flex justify-between items-center px-4 py-3 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
               <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Profile Details</span>
               <button 
                  onClick={() => setSelectedUser(null)}
                  className={`p-1.5 rounded-full transition ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
               >
                 <X className="w-4 h-4" />
               </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              <div className={`w-20 h-20 rounded-full border-4 ${isDark ? 'border-gray-800' : 'border-white shadow-lg'} overflow-hidden bg-gray-100 mb-4`}>
                {selectedUser.avatarUrl ? (
                  <img src={selectedUser.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><UserRound className="w-10 h-10 text-gray-400" /></div>
                )}
              </div>
              <h3 className={`text-xl font-black mb-1 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedUser.full_name}</h3>
              <p className={`text-xs font-bold tracking-widest uppercase mb-6 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Rank #{rows.findIndex(r => r.user_id === selectedUser.user_id) + 1}
              </p>

              <div className="w-full grid grid-cols-2 gap-3 mb-4">
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                  <Trophy className={`w-5 h-5 mb-2 ${isDark ? 'text-amber-500' : 'text-amber-500'}`} />
                  <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedUser.total_score}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Total Score</span>
                </div>
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                  <GraduationCap className={`w-5 h-5 mb-2 ${isDark ? 'text-blue-500' : 'text-blue-500'}`} />
                  <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedUser.exams_taken}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Exams Taken</span>
                </div>
              </div>

              <div className={`w-full px-4 py-3 rounded-xl border flex items-center justify-between ${isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  <span className="text-sm font-bold">Top Percentile</span>
                </div>
                <span className="text-lg font-black">
                  Top {Math.ceil(((rows.findIndex(r => r.user_id === selectedUser.user_id) + 1) / rows.length) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
