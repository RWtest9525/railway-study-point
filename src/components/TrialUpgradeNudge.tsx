import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../contexts/RouterContext';
import { supabase } from '../lib/supabase';

const DEFAULT_NUDGE_SEC = 10;
const NUDGE_MIN_SEC = 3;
const NUDGE_MAX_SEC = 3600;

function clampNudgeSec(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return DEFAULT_NUDGE_SEC;
  return Math.min(NUDGE_MAX_SEC, Math.max(NUDGE_MIN_SEC, Math.floor(value)));
}

export function TrialUpgradeNudge() {
  const { user, loading, trialExpiredNeedsPremium } = useAuth();
  const { currentPath, navigate } = useRouter();
  const [popOpen, setPopOpen] = useState(false);
  const [intervalSec, setIntervalSec] = useState(DEFAULT_NUDGE_SEC);

  const hide =
    loading ||
    !user ||
    !trialExpiredNeedsPremium ||
    currentPath === '/login' ||
    currentPath === '/signup' ||
    currentPath === '/upgrade' ||
    currentPath.startsWith('/admin-portal');

  useEffect(() => {
    if (hide) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('trial_nudge_interval_seconds')
        .eq('id', 1)
        .maybeSingle();
      if (!cancelled) {
        if (error || !data) {
          setIntervalSec(DEFAULT_NUDGE_SEC);
        } else {
          setIntervalSec(clampNudgeSec(data.trial_nudge_interval_seconds));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hide]);

  useEffect(() => {
    if (hide) return;
    const ms = clampNudgeSec(intervalSec) * 1000;
    const id = window.setInterval(() => setPopOpen(true), ms);
    return () => window.clearInterval(id);
  }, [hide, intervalSec]);

  useEffect(() => {
    if (!popOpen) return;
    const t = window.setTimeout(() => setPopOpen(false), 3500);
    return () => window.clearTimeout(t);
  }, [popOpen]);

  if (hide) {
    return null;
  }

  return (
    <>
      <div className="h-14 shrink-0 bg-gray-900" aria-hidden />
      <div className="fixed top-0 left-0 right-0 z-[200] flex flex-col items-stretch pointer-events-none">
        <div className="pointer-events-auto bg-gradient-to-r from-amber-700 to-orange-700 text-white px-4 py-3 shadow-lg flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base">
          <span className="font-medium text-center">
            Your 7-day free access has ended. Upgrade to premium to take tests again.
          </span>
          <button
            type="button"
            onClick={() => navigate('/upgrade')}
            className="bg-white text-orange-800 font-bold px-4 py-1.5 rounded-lg hover:bg-amber-50 transition shrink-0"
          >
            Upgrade to premium
          </button>
        </div>

        {popOpen && (
          <div className="pointer-events-auto mt-2 mx-auto max-w-lg w-[calc(100%-2rem)] rounded-xl border-2 border-amber-400 bg-gray-900/95 px-4 py-3 text-center shadow-2xl backdrop-blur-sm ring-2 ring-amber-500/50">
            <p className="text-amber-100 font-semibold text-sm sm:text-base">
              You have used your free limit on this platform. Please upgrade to premium to continue
              practicing.
            </p>
            <button
              type="button"
              onClick={() => {
                setPopOpen(false);
                navigate('/upgrade');
              }}
              className="mt-3 w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-5 py-2 rounded-lg transition"
            >
              Go to premium
            </button>
          </div>
        )}
      </div>
    </>
  );
}
