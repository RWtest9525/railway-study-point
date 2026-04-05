import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import {
  hasActivePremium,
  isWithinFreeTrial,
  trialWholeDaysLeft,
  FREE_TRIAL_DAYS,
} from '../lib/authUtils';
import { Crown, Calendar } from 'lucide-react';

export function Membership() {
  const { profile, effectiveRole } = useAuth();
  const { navigate } = useRouter();

  const premiumActive = hasActivePremium(profile);
  const inTrial = effectiveRole !== 'admin' && !premiumActive && isWithinFreeTrial(profile);
  const daysLeft = trialWholeDaysLeft(profile);

  return (
    <div className="min-h-screen bg-gray-900 py-6 sm:py-12 px-4">
      <div className="max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-blue-400 hover:text-blue-300 mb-6 transition flex items-center gap-1 text-sm sm:text-base"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-600/20 rounded-2xl flex items-center justify-center shrink-0">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Membership</h1>
              <p className="text-gray-500 text-xs sm:text-sm">Manage your plan and billing</p>
            </div>
          </div>

          {effectiveRole === 'admin' && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-4">
              <p className="text-red-200 text-xs sm:text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin accounts have full access. No membership plan applies.
              </p>
            </div>
          )}

          {effectiveRole !== 'admin' && premiumActive && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-green-400 font-bold flex items-center gap-2 text-lg">
                  <Crown className="w-6 h-6" />
                  Premium Active
                </p>
                <span className="bg-green-600/20 text-green-400 text-[10px] uppercase tracking-widest px-2 py-1 rounded-md border border-green-500/20 font-bold">Current Plan</span>
              </div>
              
              <div className="bg-gray-700/30 rounded-2xl p-5 space-y-4 border border-gray-700/50">
                {profile?.premium_started_at && (
                  <div className="flex items-start gap-3 text-gray-300">
                    <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-widest mb-0.5">Started On</span>
                      <span className="text-sm">{new Date(profile.premium_started_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                    </div>
                  </div>
                )}
                {profile?.premium_until && (
                  <div className="flex items-start gap-3 text-gray-300">
                    <div className="w-8 h-8 bg-amber-600/20 rounded-lg flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-widest mb-0.5">Expires On</span>
                      <span className="text-sm font-semibold text-white">{new Date(profile.premium_until).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-gray-500 text-[10px] text-center italic">
                Thank you for being a premium member of Railway Study Point!
              </p>
            </div>
          )}

          {effectiveRole !== 'admin' && !premiumActive && inTrial && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-amber-400 font-bold flex items-center gap-2 text-lg">
                  <Clock className="w-6 h-6" />
                  Free Trial Active
                </p>
              </div>
              
              <div className="bg-amber-600/10 border border-amber-500/20 rounded-2xl p-5">
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  You are currently on the <span className="text-amber-400 font-bold">{FREE_TRIAL_DAYS}-day free trial</span>. 
                  Enjoy full access to all premium exams until your trial ends.
                </p>
                {daysLeft !== null && (
                  <div className="flex items-center gap-2 bg-amber-600/20 w-fit px-3 py-1.5 rounded-full border border-amber-500/30">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">{daysLeft} day{daysLeft === 1 ? '' : 's'} remaining</span>
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
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <p className="text-white font-bold text-xl mb-2">Trial Period Ended</p>
                <p className="text-gray-400 text-sm px-4">
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
      </div>
    </div>
  );
}
  );
}
