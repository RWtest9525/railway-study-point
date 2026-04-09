import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Crown, HelpCircle, LogOut, Settings, Shield, Trophy, User, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { BrandLogo } from './BrandLogo';
import { trialWholeDaysLeft } from '../lib/authUtils';

interface UserPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserPanel({ isOpen, onClose }: UserPanelProps) {
  const { profile, signOut, isPremium, effectiveRole, trialExpiredNeedsPremium } = useAuth();
  const { navigate } = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const daysLeftTrial = useMemo(() => trialWholeDaysLeft(profile as any), [profile]);
  const [activeSection, setActiveSection] = useState<'overview' | 'account'>('overview');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate('/login');
  };

  if (!isOpen) return null;

  const infoItems = [
    { label: 'Name', value: profile?.full_name || 'Unavailable' },
    { label: 'Email', value: profile?.email || 'Unavailable' },
    { label: 'Role', value: effectiveRole || 'Unavailable' },
    {
      label: 'Member Since',
      value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unavailable',
    },
  ];

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/55 backdrop-blur-sm">
      <div className="absolute inset-x-0 bottom-0 top-auto md:inset-y-0 md:left-auto md:right-0 md:top-0 md:w-[28rem]">
        <div
          ref={panelRef}
          className="h-[86vh] rounded-t-[32px] border border-slate-200 bg-white shadow-2xl md:h-full md:rounded-none md:rounded-l-[32px]"
        >
          <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-slate-300 md:hidden" />

          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <BrandLogo variant="inline" className="ring-1 ring-slate-200" />
                <div>
                  <div className="text-sm font-bold text-slate-900">Railway Study Point</div>
                  <div className="text-xs text-slate-500">Student Panel</div>
                </div>
              </div>
              <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-3xl bg-gradient-to-br from-sky-50 via-white to-amber-50 p-4 ring-1 ring-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-slate-900">{profile?.full_name || 'Unavailable'}</div>
                  <div className="truncate text-sm text-slate-500">{profile?.email || 'Unavailable'}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {effectiveRole === 'admin' && (
                  <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                    Admin Access
                  </span>
                )}
                {isPremium ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Premium Active
                  </span>
                ) : trialExpiredNeedsPremium ? (
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                    Upgrade Required
                  </span>
                ) : (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    Trial {daysLeftTrial ?? 'Unavailable'} day left
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveSection('overview')}
              className={`flex-1 px-4 py-3 text-sm font-semibold ${activeSection === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveSection('account')}
              className={`flex-1 px-4 py-3 text-sm font-semibold ${activeSection === 'account' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}
            >
              Account
            </button>
          </div>

          <div className="space-y-5 overflow-y-auto px-5 py-5" style={{ maxHeight: 'calc(86vh - 220px)' }}>
            {activeSection === 'overview' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleNavigate('/notifications')} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                    <Bell className="mb-2 h-5 w-5 text-blue-600" />
                    <div className="text-sm font-semibold text-slate-900">Notifications</div>
                    <div className="mt-1 text-xs text-slate-500">Unavailable right now</div>
                  </button>
                  <button onClick={() => handleNavigate('/leaderboard')} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                    <Trophy className="mb-2 h-5 w-5 text-amber-500" />
                    <div className="text-sm font-semibold text-slate-900">Leaderboard</div>
                    <div className="mt-1 text-xs text-slate-500">Check your rank</div>
                  </button>
                  <button onClick={() => handleNavigate('/profile')} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                    <User className="mb-2 h-5 w-5 text-blue-600" />
                    <div className="text-sm font-semibold text-slate-900">Profile</div>
                    <div className="mt-1 text-xs text-slate-500">Edit your details</div>
                  </button>
                  <button onClick={() => handleNavigate('/support')} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                    <HelpCircle className="mb-2 h-5 w-5 text-emerald-600" />
                    <div className="text-sm font-semibold text-slate-900">Support</div>
                    <div className="mt-1 text-xs text-slate-500">Get help quickly</div>
                  </button>
                </div>

                <div className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Crown className="h-4 w-4 text-amber-500" />
                    Membership
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Status: {isPremium ? 'Premium Active' : trialExpiredNeedsPremium ? 'Upgrade required' : 'Free trial running'}</div>
                    <div>
                      {isPremium
                        ? `Premium valid until ${profile?.premium_until ? new Date(profile.premium_until).toLocaleDateString() : 'Unavailable'}`
                        : daysLeftTrial !== null
                        ? `${daysLeftTrial} trial day(s) remaining`
                        : 'Trial information unavailable'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleNavigate('/upgrade')}
                    className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                  >
                    {isPremium ? 'Manage Premium' : 'Upgrade to Premium'}
                  </button>
                </div>

                <div className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Settings className="h-4 w-4 text-slate-600" />
                    Quick status
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Notifications</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">Unavailable</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Recent stats</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">Unavailable</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {infoItems.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">{item.label}</div>
                    <div className="mt-1 text-sm font-medium text-slate-900">{item.value}</div>
                  </div>
                ))}

                {effectiveRole === 'admin' && (
                  <button
                    onClick={() => handleNavigate('/admin-portal')}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
                  >
                    <Shield className="h-4 w-4" />
                    Open Admin Panel
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 px-5 py-4">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
