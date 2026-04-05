import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { 
  Trophy, 
  Clock, 
  Shield, 
  Crown,
  ChevronRight,
  Zap,
  BookOpen
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { trialWholeDaysLeft } from '../lib/authUtils';

export function ExamSelection() {
  const { profile, isPremium, effectiveRole, trialExpiredNeedsPremium } = useAuth();
  const { navigate } = useRouter();

  const daysLeftTrial = useMemo(() => trialWholeDaysLeft(profile), [profile]);

  const mainCategories = [
    { id: 'Group-D', name: 'Group D', color: 'bg-blue-600/10 border-blue-500/50 text-blue-400' },
    { id: 'ALP', name: 'ALP', color: 'bg-orange-600/10 border-orange-500/50 text-orange-400' },
    { id: 'Technician', name: 'Technician', color: 'bg-purple-600/10 border-purple-500/50 text-purple-400' },
    { id: 'BSED', name: 'BSED', color: 'bg-green-600/10 border-green-500/50 text-green-400' },
    { id: 'NTPC', name: 'NTPC', color: 'bg-pink-600/10 border-pink-500/50 text-pink-400' },
    { id: 'Technical', name: 'Technical (Electrician/Fitter/Welder)', color: 'bg-amber-600/10 border-amber-500/50 text-amber-400' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* Header */}
      <header className="bg-gray-900/50 border-b border-gray-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo variant="nav" className="w-8 h-8" />
            <span className="font-bold text-lg tracking-tight">Railway Study Point</span>
          </div>
          {isPremium ? (
            <div className="bg-yellow-600/20 text-yellow-500 border border-yellow-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Crown className="w-3 h-3" /> Premium
            </div>
          ) : (
            <button 
              onClick={() => navigate('/upgrade')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-lg shadow-blue-900/20"
            >
              Go Premium
            </button>
          )}
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {mainCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/exams/${cat.id}`)}
                className={`aspect-square rounded-3xl border-2 p-6 flex flex-col items-center justify-center text-center transition-all hover:scale-105 active:scale-95 ${cat.color}`}
              >
                <span className="font-bold text-lg md:text-xl leading-tight">{cat.name}</span>
                <ChevronRight className="w-5 h-5 mt-4 opacity-50" />
              </button>
            ))}
          </div>
        </section>

        {/* Wide Buttons */}
        <section className="grid grid-cols-1 gap-4">
          <button
            onClick={() => navigate('/mock-tests')}
            className="w-full bg-gray-900 border-2 border-blue-500/30 hover:border-blue-500 rounded-2xl p-6 flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-lg">Mock Test</span>
                <span className="text-xs text-gray-500">Full length practice sets</span>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-600 group-hover:text-blue-400 transition" />
          </button>

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
