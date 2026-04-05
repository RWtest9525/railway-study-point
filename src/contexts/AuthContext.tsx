import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
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
  effectiveRole: 'admin' | 'student';
  isPremium: boolean;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string, email?: string, fullName?: string) => {
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
          .maybeSingle(); // use maybeSingle to be safe

        if (createError) {
          // If profile was created by another concurrent call, just fetch it
          if (createError.code === '23505') {
            const { data: existingData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            setProfile(existingData);
          } else {
            throw createError;
          }
        } else {
          setProfile(newProfile);
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(
          session.user.id,
          session.user.email,
          session.user.user_metadata?.full_name
        );
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
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
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    await loadProfile(user.id, user.email, user.user_metadata?.full_name);
  }, [user, loadProfile]);

  const effectiveRole = useMemo(() => {
    const role = getEffectiveRole(profile, user?.email);
    console.log('Effective role computed:', role, 'for user:', user?.email, 'profile role:', profile?.role);
    return role;
  }, [profile, user?.email]);

  const isPremium = useMemo(() => hasActivePremium(profile), [profile]);

  const canAccessTests = useMemo(() => {
    if (loading) return true;
    return canAccessTestsFn(profile, effectiveRole);
  }, [profile, effectiveRole, loading]);

  const trialExpiredNeedsPremiumFlag = useMemo(() => {
    if (loading || !user) return false;
    return trialExpiredNeedsPremium(profile, effectiveRole);
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    profile,
    effectiveRole,
    isPremium,
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
