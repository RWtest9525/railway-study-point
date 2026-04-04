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
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-blue-400 hover:text-blue-300 mb-6 transition"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-amber-600/20 rounded-full flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Membership</h1>
          </div>

          {effectiveRole === 'admin' && (
            <p className="text-gray-300 text-sm mb-4">
              Admin accounts have full access. No membership plan applies.
            </p>
          )}

          {effectiveRole !== 'admin' && premiumActive && (
            <div className="space-y-4">
              <p className="text-green-400 font-semibold flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Premium — active
              </p>
              <div className="bg-gray-700/50 rounded-xl p-4 space-y-3 text-sm">
                {profile?.premium_started_at && (
                  <div className="flex items-start gap-2 text-gray-300">
                    <Calendar className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" />
                    <div>
                      <span className="text-gray-500 block text-xs">Current period started</span>
                      {new Date(profile.premium_started_at).toLocaleString()}
                    </div>
                  </div>
                )}
                {profile?.premium_until && (
                  <div className="flex items-start gap-2 text-gray-300">
                    <Calendar className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-gray-500 block text-xs">Valid until</span>
                      {new Date(profile.premium_until).toLocaleString()}
                    </div>
                  </div>
                )}
                {!profile?.premium_started_at && profile?.premium_until && (
                  <p className="text-gray-400 text-xs">
                    Start date will appear for new purchases after the latest app update.
                  </p>
                )}
              </div>
            </div>
          )}

          {effectiveRole !== 'admin' && !premiumActive && inTrial && (
            <div className="space-y-3">
              <p className="text-amber-400 font-semibold">Free plan — trial active</p>
              <p className="text-gray-300 text-sm">
                You are on the free trial ({FREE_TRIAL_DAYS} days from signup). You have full test
                access until it ends.
              </p>
              {daysLeft !== null && (
                <p className="text-gray-400 text-sm">{daysLeft} day{daysLeft === 1 ? '' : 's'} left.</p>
              )}
            </div>
          )}

          {effectiveRole !== 'admin' && !premiumActive && !inTrial && (
            <div className="space-y-4">
              <p className="text-orange-300 font-semibold">Free plan — not active</p>
              <p className="text-gray-300 text-sm">
                Your trial has ended. Upgrade to premium to take tests again. You can still use the
                leaderboard and profile.
              </p>
              <button
                type="button"
                onClick={() => navigate('/upgrade')}
                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-bold py-3 rounded-lg"
              >
                Upgrade to premium
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
