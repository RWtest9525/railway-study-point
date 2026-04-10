import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  hasActivePremium,
  isWithinFreeTrial,
  trialWholeDaysLeft,
  FREE_TRIAL_DAYS,
} from '../lib/authUtils';
import { Crown, Calendar, Clock, ArrowLeft } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';

export function Membership() {
  const { profile, effectiveRole } = useAuth();
  const { navigate } = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const premiumActive = hasActivePremium(profile);
  const inTrial = effectiveRole !== 'admin' && !premiumActive && isWithinFreeTrial(profile);
  const daysLeft = trialWholeDaysLeft(profile);

  return (
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header with back arrow */}
      <header className={`${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white/95 border-gray-200'} sticky top-0 z-50 backdrop-blur-md border-b`}>
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => window.history.back()}
            className={`p-2 rounded-full transition ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <h1 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Membership</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border p-6 sm:p-8 ${isDark ? 'shadow-xl' : 'shadow-lg'}`}>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-600/20 rounded-2xl flex items-center justify-center shrink-0">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400" />
            </div>
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Membership</h1>
              <p className={`${isDark ? 'text-gray-500' : 'text-gray-500'} text-xs sm:text-sm`}>Manage your plan and billing</p>
            </div>
          </div>

          {effectiveRole === 'admin' && (
            <div className={`${isDark ? 'bg-red-900/20 border-red-500/30 text-red-200' : 'bg-red-50 border-red-200 text-red-700'} rounded-xl p-4 mb-4 border`}>
              <div className="text-xs sm:text-sm flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${isDark ? 'bg-red-400 text-white' : 'bg-red-600 text-white'}`}>A</div>
                Admin accounts have full access. No membership plan applies.
              </div>
            </div>
          )}

          {effectiveRole !== 'admin' && premiumActive && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className={`${isDark ? 'text-green-400' : 'text-green-600'} font-bold flex items-center gap-2 text-lg`}>
                  <Crown className="w-6 h-6" />
                  Premium Active
                </p>
                <span className={`${isDark ? 'bg-green-600/20 text-green-400 border-green-500/20' : 'bg-green-100 text-green-700 border-green-300'} text-[10px] uppercase tracking-widest px-2 py-1 rounded-md border font-bold`}>Current Plan</span>
              </div>
              
              <div className={`${isDark ? 'bg-gray-700/30 border-gray-700/50' : 'bg-gray-50 border-gray-200'} rounded-2xl p-5 space-y-4 border`}>
                {profile?.premium_until && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-600/20 rounded-lg flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'} block text-[10px] uppercase font-bold tracking-widest mb-0.5`}>Expires On</span>
                      <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{new Date(profile.premium_until).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <p className={`${isDark ? 'text-gray-500' : 'text-gray-500'} text-[10px] text-center italic`}>
                Thank you for being a premium member of Railway Study Point!
              </p>
            </div>
          )}

          {effectiveRole !== 'admin' && !premiumActive && inTrial && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className={`${isDark ? 'text-amber-400' : 'text-amber-600'} font-bold flex items-center gap-2 text-lg`}>
                  <Clock className="w-6 h-6" />
                  Free Trial Active
                </p>
              </div>
              
              <div className={`${isDark ? 'bg-amber-600/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'} rounded-2xl p-5 border`}>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} text-sm leading-relaxed mb-4`}>
                  You are currently on the <span className={`${isDark ? 'text-amber-400' : 'text-amber-600'} font-bold`}>{FREE_TRIAL_DAYS}-day free trial</span>. 
                  Enjoy full access to all premium exams until your trial ends.
                </p>
                {daysLeft !== null && (
                  <div className={`flex items-center gap-2 ${isDark ? 'bg-amber-600/20 border-amber-500/30' : 'bg-amber-100 border-amber-300'} w-fit px-3 py-1.5 rounded-full border`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-amber-500' : 'bg-amber-600'}`} />
                    <span className={`${isDark ? 'text-amber-400' : 'text-amber-700'} text-xs font-bold uppercase tracking-wider`}>{daysLeft} day{daysLeft === 1 ? '' : 's'} remaining</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => navigate('/upgrade')}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-blue-900/20"
              >
                Upgrade to Premium Now
              </button>
            </div>
          )}

          {effectiveRole !== 'admin' && !premiumActive && !inTrial && (
            <div className="space-y-6 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${isDark ? 'bg-red-600/20' : 'bg-red-100'}`}>
                <Clock className={`w-8 h-8 ${isDark ? 'text-red-500' : 'text-red-600'}`} />
              </div>
              <div>
                <p className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-xl mb-2`}>Trial Period Ended</p>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm px-4`}>
                  Your free week of full access has expired. Upgrade to premium to unlock all exams and continue your preparation.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/upgrade')}
                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-yellow-900/20 text-lg"
              >
                Upgrade to Premium
              </button>
            </div>
          )}
        </div>
        </main>
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
