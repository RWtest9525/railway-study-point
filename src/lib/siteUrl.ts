/** Public URL of the app (for Supabase email links & OAuth). Prefer current origin; override on Vercel if needed. */
export function getAppOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, '');
  }
  return window.location.origin;
}
