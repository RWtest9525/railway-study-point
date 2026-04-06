import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Trophy, 
  Clock, 
  Shield, 
  Crown,
  ChevronRight,
  Zap,
  BookOpen,
  Bell
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { trialWholeDaysLeft } from '../lib/authUtils';
import { BottomNav } from '../components/BottomNav';

export function ExamSelection() {
  const { profile, isPremium, effectiveRole, trialExpiredNeedsPremium } = useAuth();
  const { navigate } = useRouter();

  const daysLeftTrial = useMemo(() => trialWholeDaysLeft(profile), [profile]);

  const mainCategories = [
    { id: 'Group-D', name: 'Group D', gradient: 'from-blue-600/20 to-blue-800/20', border: 'border-blue-500/30', text: 'text-blue-400', hover: 'hover:border-blue-400 hover:shadow-blue-500/20' },
    { id: 'ALP', name: 'ALP', gradient: 'from-orange-600/20 to-orange-800/20', border: 'border-orange-500/30', text: 'text-orange-400', hover: 'hover:border-orange-400 hover:shadow-orange-500/20' },
    { id: 'Technician', name: 'Technician', gradient: 'from-purple-600/20 to-purple-800/20', border: 'border-purple-500/30', text: 'text-purple-400', hover: 'hover:border-purple-400 hover:shadow-purple-500/20' },
    { id: 'BSED', name: 'BSED', gradient: 'from-green-600/20 to-green-800/20', border: 'border-green-500/30', text: 'text-green-400', hover: 'hover:border-green-400 hover:shadow-green-500/20' },
    { id: 'NTPC', name: 'NTPC', gradient: 'from-pink-600/20 to-pink-800/20', border: 'border-pink-500/30', text: 'text-pink-400', hover: 'hover:border-pink-400 hover:shadow-pink-500/20' },
    { id: 'Technical', name: 'Technical', gradient: 'from-amber-600/20 to-amber-800/20', border: 'border-amber-500/30', text: 'text-amber-400', hover: 'hover:border-amber-400 hover:shadow-amber-500/20' },
  ];

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white/95 border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left: Logo and Company Name */}
          <div className="flex items-center gap-2 min-w-0">
            <BrandLogo variant="nav" className="w-8 h-8 sm:w-10 sm:h-10 shrink-0" />
            <span className={`font-bold text-base sm:text-xl tracking-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>Railway Study Point</span>
          </div>

          {/* Right: Notification Bell */}
          <button
            onClick={() => navigate('/notifications')}
            className={`relative p-2 rounded-lg transition shrink-0 ${isDark ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            <Bell className="w-6 h-6" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 ${isDark ? 'border-gray-900' : 'border-gray-50'}" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Trial/Expiry Nudges */}
        {!isPremium && effectiveRole !== 'admin' && (
          <>
            {daysLeftTrial !== null && (
              <div className={`${isDark ? 'bg-amber-600/10 border-amber-500/20' : 'bg-amber-100 border-amber-300'} rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2`}>
                <Clock className={`w-5 h-5 ${isDark ? 'text-amber-500' : 'text-amber-600'} shrink-0`} />
                <p className={`${isDark ? 'text-amber-400' : 'text-amber-700'} text-sm font-medium`}>
                  Free trial: {daysLeftTrial} day{daysLeftTrial === 1 ? '' : 's'} left
                </p>
              </div>
            )}
            {trialExpiredNeedsPremium && (
              <div className={`${isDark ? 'bg-red-600/10 border-red-500/20' : 'bg-red-100 border-red-300'} rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2`}>
                <Shield className={`w-5 h-5 ${isDark ? 'text-red-500' : 'text-red-600'} shrink-0`} />
                <p className={`${isDark ? 'text-red-400' : 'text-red-700'} text-sm`}>Trial expired. Upgrade to unlock exams.</p>
              </div>
            )}
          </>
        )}

        {/* Category Grid */}
        <section>
          <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <BookOpen className={`w-5 h-5 ${isDark ? 'text-blue-500' : 'text-blue-600'}`} />
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
            className={`w-full ${isDark ? 'bg-gray-900 border-amber-500/30 hover:border-amber-500' : 'bg-white border-amber-300 hover:border-amber-500'} rounded-2xl p-6 flex items-center justify-between group transition-all shadow-sm`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-amber-600/20' : 'bg-amber-100'} flex items-center justify-center`}>
                <Trophy className={`w-6 h-6 ${isDark ? 'text-amber-500' : 'text-amber-600'}`} />
              </div>
              <div className="text-left">
                <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Leaderboard</h3>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm`}>See where you rank among peers</p>
              </div>
            </div>
            <ChevronRight className={`w-6 h-6 ${isDark ? 'text-amber-500' : 'text-amber-600'} group-hover:translate-x-1 transition-transform`} />
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
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
