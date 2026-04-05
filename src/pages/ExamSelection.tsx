import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { 
  Trophy, 
  Clock, 
  Shield, 
  Crown,
  ChevronRight,
  Zap,
  BookOpen,
  Settings,
  User,
  LogOut,
  Briefcase
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { trialWholeDaysLeft } from '../lib/authUtils';

export function ExamSelection() {
  const { profile, isPremium, effectiveRole, trialExpiredNeedsPremium, signOut } = useAuth();
  const { navigate } = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const daysLeftTrial = useMemo(() => trialWholeDaysLeft(profile), [profile]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const mainCategories = [
    { id: 'Group-D', name: 'Group D', gradient: 'from-blue-600/20 to-blue-800/20', border: 'border-blue-500/30', text: 'text-blue-400', hover: 'hover:border-blue-400 hover:shadow-blue-500/20' },
    { id: 'ALP', name: 'ALP', gradient: 'from-orange-600/20 to-orange-800/20', border: 'border-orange-500/30', text: 'text-orange-400', hover: 'hover:border-orange-400 hover:shadow-orange-500/20' },
    { id: 'Technician', name: 'Technician', gradient: 'from-purple-600/20 to-purple-800/20', border: 'border-purple-500/30', text: 'text-purple-400', hover: 'hover:border-purple-400 hover:shadow-purple-500/20' },
    { id: 'BSED', name: 'BSED', gradient: 'from-green-600/20 to-green-800/20', border: 'border-green-500/30', text: 'text-green-400', hover: 'hover:border-green-400 hover:shadow-green-500/20' },
    { id: 'NTPC', name: 'NTPC', gradient: 'from-pink-600/20 to-pink-800/20', border: 'border-pink-500/30', text: 'text-pink-400', hover: 'hover:border-pink-400 hover:shadow-pink-500/20' },
    { id: 'Technical', name: 'Technical', gradient: 'from-amber-600/20 to-amber-800/20', border: 'border-amber-500/30', text: 'text-amber-400', hover: 'hover:border-amber-400 hover:shadow-amber-500/20' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* Header */}
      <header className="bg-gray-900/50 border-b border-gray-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between">
          {/* Left: Logo and Company Name */}
          <div className="flex items-center gap-1.5 min-w-0">
            <BrandLogo variant="nav" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
            <span className="font-bold text-xs sm:text-base tracking-tight truncate text-white hidden md:block">Railway Study Point</span>
            <span className="font-bold text-xs tracking-tight truncate text-white md:hidden">RSP</span>
          </div>

          {/* Right: Premium, Settings */}
          <div className="flex items-center gap-2">
            {/* Premium Button / Badge */}
            {isPremium ? (
              <div className="bg-yellow-600/20 text-yellow-500 border border-yellow-500/30 px-2 sm:px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Crown className="w-3 h-3" />
                <span className="hidden lg:inline">Premium</span>
              </div>
            ) : (
              <button 
                onClick={() => navigate('/upgrade')}
                className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white p-2 rounded-lg transition shadow-lg shadow-yellow-900/20 shrink-0"
                title="Go Premium"
              >
                <Crown className="w-4 h-4" />
              </button>
            )}

            {/* Settings Button with Dropdown */}
            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                onClick={() => setSettingsOpen((prev) => !prev)}
                className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition shrink-0"
                aria-expanded={settingsOpen}
              >
                <Settings className="w-5 h-5" />
              </button>
              
              {settingsOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-[150] py-2 text-sm overflow-hidden">
                  {/* User Name Display */}
                  <div className="px-4 py-3 border-b border-gray-700 mb-1">
                    <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-1">Signed in as</p>
                    <p className="text-white font-medium truncate">{profile?.full_name || 'Student'}</p>
                  </div>
                  
                  {/* Leaderboard Option (moved from header) */}
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-gray-200 hover:bg-gray-700 transition flex items-center gap-3"
                    onClick={() => {
                      setSettingsOpen(false);
                      navigate('/leaderboard');
                    }}
                  >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Leaderboard
                  </button>
                  
                  {/* Profile Option */}
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
                  
                  {/* Membership Option */}
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
                  
                  {/* Contact Support */}
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
                  
                  {/* Logout Button */}
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
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Trial/Expiry Nudges */}
        {!isPremium && effectiveRole !== 'admin' && (
          <>
            {daysLeftTrial !== null && (
              <div className="bg-amber-600/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-amber-400 text-sm font-medium">
                  Free trial: {daysLeftTrial} day{daysLeftTrial === 1 ? '' : 's'} left
                </p>
              </div>
            )}
            {trialExpiredNeedsPremium && (
              <div className="bg-red-600/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <Shield className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-red-400 text-sm">Trial expired. Upgrade to unlock exams.</p>
              </div>
            )}
          </>
        )}

        {/* Category Grid */}
        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            Select Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {mainCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/exams/${cat.id}`)}
                className={`bg-gradient-to-br ${cat.gradient} rounded-xl sm:rounded-2xl border-2 ${cat.border} ${cat.hover} p-3 sm:p-4 flex flex-col items-center justify-center text-center transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl`}
              >
                <span className={`font-bold text-xs sm:text-sm md:text-base leading-tight ${cat.text} line-clamp-2`}>{cat.name}</span>
                <ChevronRight className={`w-4 h-5 mt-1 sm:mt-2 ${cat.text} opacity-60 group-hover:opacity-100 transition-opacity`} />
              </button>
            ))}
          </div>
        </section>

        {/* Leaderboard Button */}
        <section className="grid grid-cols-1 gap-4">
          <button
            onClick={() => navigate('/leaderboard')}
            className="w-full bg-gray-900 border-2 border-amber-500/30 hover:border-amber-500 rounded-2xl p-6 flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-lg">Leaderboard</span>
                <span className="text-xs text-gray-500">Top performers ranking</span>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-600 group-hover:text-amber-400 transition" />
          </button>
        </section>

        {/* Today Live Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              Today Live
              <span className="flex items-center gap-1 bg-red-600/20 text-red-500 border border-red-500/30 px-2 py-0.5 rounded text-[10px] uppercase font-black animate-pulse">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                Live
              </span>
            </h2>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {[1, 2, 3].map((i) => (
              <div 
                key={i}
                className="min-w-[280px] bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">NTPC Stage 1</span>
                  <span className="text-[10px] text-gray-500">Starts in 2h</span>
                </div>
                <h3 className="font-bold text-lg leading-snug">Full Mock Test #0{i}</h3>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 90 min</span>
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> 100 Qs</span>
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-xl text-sm font-bold transition">
                  Remind Me
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
