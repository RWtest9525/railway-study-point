import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { cache, createCacheKey } from '../lib/dataCache';
import {
  getEffectiveRole,
  hasActivePremium,
  canAccessTests as canAccessTestsFn,
  trialExpiredNeedsPremium,
} from '../lib/authUtils';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  effectiveRole: 'admin' | 'student' | 'banned';
  isPremium: boolean;
  isBanned: boolean;
  canAccessTests: boolean;
  trialExpiredNeedsPremium: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Track login session start time
let loginSessionStart: Date | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRestored = useRef(false);

  const loadProfile = useCallback(async (userId: string, email?: string, fullName?: string, forceRefresh = false) => {
    // Check cache first (unless force refresh)
    const cacheKey = createCacheKey('profile', userId);
    if (!forceRefresh) {
      const cachedProfile = cache.get<Profile>(cacheKey);
      if (cachedProfile) {
        setProfile(cachedProfile);
        setLoading(false);
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data && email) {
        // Create profile if it doesn't exist (e.g. after Google login)
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            full_name: fullName || email.split('@')[0],
            is_premium: false,
          })
          .select()
          .maybeSingle();

        if (createError) {
          // If profile was created by another concurrent call, just fetch it
          if (createError.code === '23505') {
            const { data: existingData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            setProfile(existingData);
            cache.set(cacheKey, existingData);
          } else {
            throw createError;
          }
        } else if (newProfile) {
          setProfile(newProfile);
          cache.set(cacheKey, newProfile);
        }
      } else if (data) {
        setProfile(data);
        cache.set(cacheKey, data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Record login in login_history table
  const recordLogin = useCallback(async (userId: string) => {
    try {
      loginSessionStart = new Date();
      
      // Get approximate IP and user agent (note: IP requires server-side to get accurately)
      const { error } = await supabase
        .from('login_history')
        .insert({
          user_id: userId,
          login_at: loginSessionStart.toISOString(),
          user_agent: navigator.userAgent
        });
      
      if (error) {
        console.error('Failed to record login:', error);
      }
    } catch (err) {
      console.error('Error recording login:', err);
    }
  }, []);

  // Record logout in login_history table
  const recordLogout = useCallback(async (userId: string) => {
    try {
      if (!loginSessionStart) return;
      
      const logoutTime = new Date();
      const durationSeconds = Math.floor((logoutTime.getTime() - loginSessionStart.getTime()) / 1000);
      
      // Update the most recent login_history entry for this user
      const { error } = await supabase
        .from('login_history')
        .update({
          logout_at: logoutTime.toISOString(),
          duration_seconds: durationSeconds
        })
        .match({ user_id: userId })
        .is('logout_at', null)
        .order('login_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Failed to record logout:', error);
      }
      
      loginSessionStart = null;
    } catch (err) {
      console.error('Error recording logout:', err);
    }
  }, []);

  useEffect(() => {
    // First, try to restore session from localStorage (Supabase handles this automatically)
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session restore:', session?.user?.email);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(
          session.user.id,
          session.user.email,
          session.user.user_metadata?.full_name
        ).then(() => {
          recordLogin(session.user.id);
        });
      } else {
        setLoading(false);
      }
      sessionRestored.current = true;
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      switch (event) {
        case 'SIGNED_IN':
          setUser(session?.user ?? null);
          if (session?.user) {
            loadProfile(
              session.user.id,
              session.user.email,
              session.user.user_metadata?.full_name
            ).then(() => {
              recordLogin(session.user.id);
            });
          }
          break;
          
        case 'SIGNED_OUT':
          if (user) {
            recordLogout(user.id);
          }
          setUser(null);
          setProfile(null);
          setLoading(false);
          break;
          
        case 'TOKEN_REFRESHED':
          // Session is still valid, keep user logged in
          if (session?.user) {
            setUser(session.user);
          }
          break;
          
        case 'USER_UPDATED':
        case 'INITIAL_SESSION':
          if (session?.user) {
            setUser(session.user);
            loadProfile(
              session.user.id,
              session.user.email,
              session.user.user_metadata?.full_name
            );
          }
          break;
          
        default:
          (async () => {
            setUser(session?.user ?? null);
            if (session?.user) {
              await loadProfile(
                session.user.id,
                session.user.email,
                session.user.user_metadata?.full_name
              );
            } else {
              setProfile(null);
              setLoading(false);
            }
          })();
      }
    });

    // Handle page visibility change to track session duration
    const handleVisibilityChange = () => {
      if (document.hidden && user) {
        // Page is hidden, could record this as potential logout
      } else if (!document.hidden && user) {
        // Page is visible again, ensure session is still valid
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user && session.user.id !== user.id) {
            // Different user session, reload profile
            loadProfile(session.user.id, session.user.email);
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (user) {
        recordLogout(user.id);
      }
    };
  }, [loadProfile, recordLogin, recordLogout, user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Force refresh - bypass cache
    await loadProfile(user.id, user.email, user.user_metadata?.full_name, true);
  }, [user, loadProfile]);

  const effectiveRole = useMemo(() => {
    const role = getEffectiveRole(profile, user?.email);
    return role;
  }, [profile, user?.email]);

  const isPremium = useMemo(() => hasActivePremium(profile), [profile]);
  const isBanned = useMemo(() => effectiveRole === 'banned', [effectiveRole]);

  const canAccessTests = useMemo(() => {
    if (loading || isBanned) return false;
    const role = effectiveRole === 'banned' ? 'student' as const : effectiveRole as 'admin' | 'student';
    return canAccessTestsFn(profile, role);
  }, [profile, effectiveRole, loading, isBanned]);

  const trialExpiredNeedsPremiumFlag = useMemo(() => {
    if (loading || !user) return false;
    const role = effectiveRole === 'banned' ? 'student' as const : effectiveRole as 'admin' | 'student';
    return trialExpiredNeedsPremium(profile, role);
  }, [profile, effectiveRole, loading, user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) {
      console.error('Signup error:', error.message);
      throw error;
    }

    // If session is returned immediately, Supabase email confirmation is OFF
    if (data.session) {
      setUser(data.session.user);
      await loadProfile(
        data.session.user.id,
        data.session.user.email,
        data.session.user.user_metadata?.full_name
      );
    }

    return { needsEmailConfirmation: !data.session };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    try {
      if (user) {
        await recordLogout(user.id);
      }
      // Clear local state first for instant feedback
      setUser(null);
      setProfile(null);
      setLoading(true);
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.error('Sign out error:', error);
        // Still clear state even if there's an error
      }
      
      // Clear any cached data
      localStorage.removeItem('sb-' + (import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || '') + '-auth-token');
      setLoading(false);
    } catch (err) {
      console.error('Sign out error:', err);
      // Force clear state on error
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  const value = {
    user,
    profile,
    effectiveRole,
    isPremium,
    isBanned,
    canAccessTests,
    trialExpiredNeedsPremium: trialExpiredNeedsPremiumFlag,
    loading,
    refreshProfile,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}