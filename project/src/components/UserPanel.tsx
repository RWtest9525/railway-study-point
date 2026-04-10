import { useEffect, useMemo, useRef } from 'react';
import { Bell, ChevronRight, Crown, LogOut, Shield, Trophy, User, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { BrandLogo } from './BrandLogo';
import { trialWholeDaysLeft } from '../lib/authUtils';

interface UserPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notificationCount?: number;
}

export function UserPanel({ isOpen, onClose, notificationCount = 0 }: UserPanelProps) {
  const { profile, signOut, isPremium, effectiveRole, trialExpiredNeedsPremium } = useAuth();
  const { navigate } = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const daysLeftTrial = useMemo(() => trialWholeDaysLeft(profile as any), [profile]);

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

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate('/login');
  };

  if (!isOpen) return null;

  const quickRows = [
    { title: 'Profile', subtitle: 'Manage your details', icon: User, action: () => go('/profile') },
    { title: 'Notifications', subtitle: notificationCount > 0 ? `${notificationCount} new update(s)` : 'Check admin updates', icon: Bell, action: () => go('/notifications') },
    { title: 'Leaderboard', subtitle: 'See top performers', icon: Trophy, action: () => go('/leaderboard') },
    { title: isPremium ? 'Premium plan' : 'Upgrade plan', subtitle: isPremium ? 'Membership active' : 'Unlock premium tests', icon: Crown, action: () => go('/upgrade') },
  ];

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-sm">
      <div className="absolute inset-x-0 bottom-0 top-auto md:inset-y-0 md:left-auto md:right-0 md:w-[24rem]">
        <div
          ref={panelRef}
          className="h-[82vh] rounded-t-[32px] border border-slate-200 bg-white shadow-2xl md:h-full md:rounded-none md:rounded-l-[28px]"
        >
          <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-slate-300 md:hidden" />

          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrandLogo variant="inline" className="ring-1 ring-slate-200" />
                <div>
                  <div className="text-sm font-bold text-slate-900">Railway Study Point</div>
                  <div className="text-xs text-slate-500">Account & Access</div>
                </div>
              </div>
              <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-[28px] bg-gradient-to-br from-sky-50 via-white to-amber-50 p-4 ring-1 ring-slate-200">
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
                  <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-600">
                    Admin
                  </span>
                )}
                {isPremium ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                    Premium Active
                  </span>
                ) : trialExpiredNeedsPremium ? (
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-700">
                    Upgrade Required
                  </span>
                ) : (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">
                    {daysLeftTrial ?? 'Unavailable'} day(s) left
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => go('/notifications')} className="relative rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Alerts</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">Notifications</div>
                  {notificationCount > 0 && (
                    <span className="absolute right-3 top-3 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse">
                      {notificationCount}
                    </span>
                  )}
                </button>
                <button onClick={() => go('/upgrade')} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Access</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{isPremium ? 'Premium Active' : 'Manage Plan'}</div>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-5 overflow-y-auto px-5 py-5" style={{ maxHeight: 'calc(82vh - 205px)' }}>
            <div className="space-y-3">
              {quickRows.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.title}
                    onClick={card.action}
                    className="flex w-full items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900">{card.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{card.subtitle}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                );
              })}
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
                    ? `Valid until ${profile?.premium_until ? new Date(profile.premium_until).toLocaleDateString() : 'Unavailable'}`
                    : daysLeftTrial !== null
                    ? `${daysLeftTrial} trial day(s) remaining`
                    : 'Unavailable'}
                </div>
              </div>
              <button onClick={() => go('/upgrade')} className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                {isPremium ? 'Manage Premium' : 'Upgrade to Premium'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Joined</div>
                <div className="mt-2 text-sm font-medium text-slate-900">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unavailable'}</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
                <div className="mt-2 text-sm font-medium text-slate-900">{effectiveRole === 'admin' ? 'Admin account' : 'Student account'}</div>
              </div>
            </div>

            {effectiveRole === 'admin' && (
              <button onClick={() => go('/admin-portal')} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                <Shield className="h-4 w-4" />
                Open Admin Panel
              </button>
            )}
          </div>

          <div className="border-t border-slate-200 px-5 py-4">
            <button onClick={handleSignOut} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
