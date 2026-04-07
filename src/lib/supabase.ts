import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Exponential backoff retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 second base delay
const FETCH_TIMEOUT_MS = 15000; // 15 seconds timeout

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
 * Retries failed requests up to MAX_RETRIES times with increasing delays (1s, 2s, 4s)
 * Includes 15-second timeout for each request
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
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        // Add small random jitter to prevent thundering herd
        const jitter = Math.random() * 200;
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

      // Continue to next retry iteration
      console.warn(`Fetch attempt ${attempt + 1} failed. Retrying in ${BASE_DELAY_MS * Math.pow(2, attempt)}ms...`, lastError.message);
    }
  }

  // This should never be reached, but TypeScript needs a return
  throw lastError || new Error('Unknown error in fetchWithRetry');
};

// Configure persistent storage for the session with exponential backoff retry
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
  // Use custom fetch with exponential backoff retry for all Supabase requests
  global: {
    fetch: fetchWithRetry,
  },
});
