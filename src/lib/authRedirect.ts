/** Base URL for Supabase auth redirects (password reset, etc.) */
export function getAuthRedirectOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}
