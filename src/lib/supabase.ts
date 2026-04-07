import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Exponential backoff retry configuration
const MAX_RETRIES = 3;
const FETCH_TIMEOUT_MS = 30000; // 30 seconds timeout for cold starts

// Retry delays: 1s, 2s, 5s
const RETRY_DELAYS_MS = [1000, 2000, 5000];

/**
 * Checks if an error is a network-related error that should be retried
 * @param error - The error to check
 * @returns true if the error is a network error that should trigger a retry
 */
const isNetworkError = (error: Error): boolean => {
  const errorMessage = error.message.toLowerCase();
  // Check for common network error patterns
  return (
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('network error') ||
    errorMessage.includes('network') ||
    errorMessage.includes('fetch')
  );
};

/**
 * Creates a fetch request with timeout support
 * @param input - The fetch request URL or Request object
 * @param init - Optional fetch init options
 * @param timeoutMs - Timeout in milliseconds
 * @returns A Promise resolving to the Response
 */
const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  const response = await fetch(input, {
    ...init,
    signal: controller.signal,
  });
  
  clearTimeout(timeoutId);
  return response;
};

/**
 * Custom fetch wrapper with exponential backoff retry logic and timeout
 * Retries failed requests up to MAX_RETRIES times with delays (1s, 2s, 5s)
 * Includes 30-second timeout for each request to handle cold starts
 * @param input - The fetch request URL or Request object
 * @param init - Optional fetch init options
 * @returns A Promise resolving to the Response
 */
const fetchWithRetry = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Apply delay before retry (not on first attempt)
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s, 5s
        const delayMs = RETRY_DELAYS_MS[attempt - 1] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
        // Add small random jitter to prevent thundering herd
        const jitter = Math.random() * 300;
        await new Promise((resolve) => setTimeout(resolve, delayMs + jitter));
      }

      const response = await fetchWithTimeout(input, init || {}, FETCH_TIMEOUT_MS);
      return response;
    } catch (error) {
      lastError = error as Error;

      // Handle timeout errors (AbortError)
      if (lastError.name === 'AbortError') {
        lastError.message = `Request timeout after ${FETCH_TIMEOUT_MS / 1000} seconds`;
      }

      // Only retry on network errors or timeouts, not on other types of errors
      if (!isNetworkError(lastError) && lastError.name !== 'AbortError') {
        throw lastError;
      }

      // If we've exhausted all retries, throw the error
      if (attempt >= MAX_RETRIES) {
        throw lastError;
      }

      // Continue to next retry iteration - suppress error messages during retry
      console.debug(`Fetch attempt ${attempt + 1} failed. Retrying in ${RETRY_DELAYS_MS[attempt]}ms...`, lastError.message);
    }
  }

  // This should never be reached, but TypeScript needs a return
  throw lastError || new Error('Unknown error in fetchWithRetry');
};

// Configure Supabase client with optimized settings for reliability
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  // Explicitly set the database schema
  db: {
    schema: 'public',
  },
  auth: {
    // Use localStorage for persistent sessions across browser restarts
    storage: localStorage,
    // Auto-refresh tokens before they expire
    autoRefreshToken: true,
    // Persist session even after browser close - CRITICAL for preventing login flash
    persistSession: true,
    // Detect session changes in other tabs
    detectSessionInUrl: true,
  },
  // Use custom fetch with exponential backoff retry for all Supabase requests
  global: {
    fetch: fetchWithRetry,
  },
  // Realtime configuration
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
