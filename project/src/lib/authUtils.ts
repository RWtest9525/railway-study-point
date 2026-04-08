// Profile type matching Firestore structure
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'student';
  is_premium: boolean;
  premium_expires_at?: string;
  avatar_url?: string;
  ban_reason?: string;
  created_at: string;
  updated_at: string;
}

export const ADMIN_EMAILS = [
  'saichauhan239@gmail.com',
  'yashvishal647@gmail.com',
];

export function normalizeEmail(email: string | undefined | null): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

export function isSuperAdminEmail(email: string | undefined | null): boolean {
  const norm = normalizeEmail(email);
  if (!norm) return false;
  return ADMIN_EMAILS.some((e) => normalizeEmail(e) === norm);
}

export function getEffectiveRole(
  profile: Profile | null,
  authEmail: string | undefined | null
): 'admin' | 'student' | 'banned' {
  const normAuthEmail = normalizeEmail(authEmail);
  const normProfileEmail = normalizeEmail(profile?.email);
  
  // 1. Check for Banned Status first (highest priority)
  if (profile?.ban_reason) {
    return 'banned';
  }

  // 2. Check for Super Admin
  if (isSuperAdminEmail(normAuthEmail) || isSuperAdminEmail(normProfileEmail)) {
    return 'admin';
  }
  
  // 3. Check for Database Admin
  if (profile?.role === 'admin') return 'admin';
  
  return 'student';
}

export const FREE_TRIAL_DAYS = 7;

export function hasActivePremium(profile: Profile | null): boolean {
  if (!profile) return false;
  if (profile.premium_expires_at) {
    return new Date(profile.premium_expires_at) > new Date();
  }
  return profile.is_premium === true;
}

/** First 7 days after signup: full access without premium. */
export function isWithinFreeTrial(profile: Profile | null): boolean {
  if (!profile) return true; // If loading or newly created, assume in trial
  if (!profile.created_at) return true; // Default to trial for new users
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