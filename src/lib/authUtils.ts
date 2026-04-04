import type { Database } from './database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export const DEFAULT_ADMIN_EMAIL = 'Saichauhan239@gmail.com';

export function normalizeEmail(email: string | undefined | null): string {
  return (email ?? '').trim().toLowerCase();
}

export function isSuperAdminEmail(email: string | undefined | null): boolean {
  return normalizeEmail(email) === normalizeEmail(DEFAULT_ADMIN_EMAIL);
}

export function getEffectiveRole(
  profile: Profile | null,
  authEmail: string | undefined | null
): 'admin' | 'student' {
  if (!profile) return 'student';
  if (profile.role === 'admin') return 'admin';
  if (isSuperAdminEmail(authEmail) || isSuperAdminEmail(profile.email)) return 'admin';
  return 'student';
}

export const FREE_TRIAL_DAYS = 7;

export function hasActivePremium(profile: Profile | null): boolean {
  if (!profile) return false;
  if (profile.premium_until) {
    return new Date(profile.premium_until) > new Date();
  }
  return profile.is_premium === true;
}

/** First 7 days after signup: full access without premium. */
export function isWithinFreeTrial(profile: Profile | null): boolean {
  if (!profile?.created_at) return false;
  const start = new Date(profile.created_at);
  const end = new Date(start);
  end.setDate(end.getDate() + FREE_TRIAL_DAYS);
  return new Date() < end;
}

/** Can start / take exams (admin, premium, or inside 7-day trial). */
export function canAccessTests(
  profile: Profile | null,
  effectiveRole: 'admin' | 'student'
): boolean {
  if (effectiveRole === 'admin') return true;
  if (hasActivePremium(profile)) return true;
  return isWithinFreeTrial(profile);
}

/** Logged-in student: trial over and not premium — show upgrade nudges (not admins). */
export function trialExpiredNeedsPremium(
  profile: Profile | null,
  effectiveRole: 'admin' | 'student'
): boolean {
  if (effectiveRole === 'admin') return false;
  if (!profile) return false;
  if (hasActivePremium(profile)) return false;
  return !isWithinFreeTrial(profile);
}

/** Whole days left in free trial (0 = last day). Null if not in trial or premium/admin context omitted. */
export function trialWholeDaysLeft(profile: Profile | null): number | null {
  if (!profile?.created_at) return null;
  if (hasActivePremium(profile)) return null;
  const start = new Date(profile.created_at);
  const end = new Date(start);
  end.setDate(end.getDate() + FREE_TRIAL_DAYS);
  const now = new Date();
  if (now >= end) return null;
  const ms = end.getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
