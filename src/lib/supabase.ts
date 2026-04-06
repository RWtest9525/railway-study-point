import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Configure persistent storage for the session
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use localStorage for persistent sessions across browser restarts
    storage: localStorage,
    // Auto-refresh tokens before they expire
    autoRefreshToken: true,
    // Persist session even after browser close
    persistSession: true,
    // Detect session changes in other tabs
    detectSessionInUrl: true,
  },
});