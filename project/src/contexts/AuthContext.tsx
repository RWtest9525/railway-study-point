import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  signInWithPopup,
  updateProfile,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { cache, createCacheKey } from '../lib/dataCache';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'student';
  is_premium: boolean;
  premium_until?: string;
  avatar_url?: string;
  ban_reason?: string;
  created_at: string;
  updated_at: string;
}

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

// Helper function to determine effective role
const getEffectiveRole = (profile: Profile | null, userEmail?: string): 'admin' | 'student' | 'banned' => {
  if (profile?.ban_reason) return 'banned';
  
  // Check if user email is in admin list (for initial setup)
  const adminEmails = ['admin@railwaystudy.com', 'admin@test.com', 'yashvishal647@gmail.com', 'saichauhan239@gmail.com'];
  if (profile?.role === 'admin' || (userEmail && adminEmails.includes(userEmail.toLowerCase()))) {
    return 'admin';
  }
  
  return 'student';
};

// Helper to check if user has active premium
const hasActivePremium = (profile: Profile | null): boolean => {
  if (!profile) return false;
  if (profile.is_premium) {
    if (profile.premium_until) {
      return new Date(profile.premium_until) > new Date();
    }
    return true;
  }
  return false;
};

// Helper to check if user can access tests
const canAccessTests = (profile: Profile | null, role: 'admin' | 'student'): boolean => {
  if (role === 'admin') return true;
  // Students need premium or are within trial
  return hasActivePremium(profile);
};

// Helper to check if trial expired and needs premium
const trialExpiredNeedsPremium = (profile: Profile | null, role: 'admin' | 'student'): boolean => {
  if (role === 'admin') return false;
  return !hasActivePremium(profile);
};

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
        return;
      }
    }

    try {
      const profileRef = doc(db, 'profiles', userId);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const data = profileSnap.data() as Profile;
        setProfile(data);
        cache.set(cacheKey, data);
      } else if (email) {
        // Create profile if it doesn't exist (e.g. after Google login)
        const newProfile: Omit<Profile, 'created_at' | 'updated_at'> = {
          id: userId,
          email: email,
          full_name: fullName || email.split('@')[0],
          role: 'student',
          is_premium: false,
        };

        const profileData: Profile = {
          ...newProfile,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await setDoc(profileRef, profileData);
        setProfile(profileData);
        cache.set(cacheKey, profileData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, []);

  // Record login in login_history collection
  const recordLogin = useCallback(async (userId: string) => {
    try {
      loginSessionStart = new Date();
      
      const loginRef = doc(db, 'login_history', `${userId}_${Date.now()}`);
      await setDoc(loginRef, {
        user_id: userId,
        login_at: loginSessionStart.toISOString(),
        user_agent: navigator.userAgent,
        logout_at: null,
        duration_seconds: null,
      });
    } catch (error) {
      console.error('Failed to record login:', error);
    }
  }, []);

  // Record logout in login_history collection
  const recordLogout = useCallback(async (userId: string) => {
    try {
      if (!loginSessionStart) return;
      
      const logoutTime = new Date();
      const durationSeconds = Math.floor((logoutTime.getTime() - loginSessionStart.getTime()) / 1000);
      
      // Query for the most recent login entry without logout
      // Note: In production, you'd want to use a more efficient approach
      const loginRef = doc(db, 'login_history', `${userId}_${loginSessionStart.toISOString()}`);
      await updateDoc(loginRef, {
        logout_at: logoutTime.toISOString(),
        duration_seconds: durationSeconds
      });
      
      loginSessionStart = null;
    } catch (error) {
      console.error('Failed to record logout:', error);
    }
  }, []);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email);
      
      if (firebaseUser) {
        setUser(firebaseUser);
        // Load profile but don't wait for it to set loading to false
        loadProfile(
          firebaseUser.uid,
          firebaseUser.email || undefined,
          firebaseUser.displayName || undefined
        ).then(() => {
          recordLogin(firebaseUser.uid);
        });
      } else {
        setUser(null);
        setProfile(null);
      }
      
      // Set loading to false once we know the auth state
      setLoading(false);
      
      if (!sessionRestored.current) {
        sessionRestored.current = true;
      }
    });

    return () => {
      unsubscribe();
      if (user) {
        recordLogout(user.uid);
      }
    };
  }, [loadProfile, recordLogin, recordLogout, user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Force refresh - bypass cache
    await loadProfile(user.uid, user.email || undefined, user.displayName || undefined, true);
  }, [user, loadProfile]);

  const effectiveRole = useMemo(() => {
    const role = getEffectiveRole(profile, user?.email);
    return role;
  }, [profile, user?.email]);

  const isPremium = useMemo(() => hasActivePremium(profile), [profile]);
  const isBanned = useMemo(() => effectiveRole === 'banned', [effectiveRole]);

  const canAccessTestsValue = useMemo(() => {
    if (loading || isBanned) return false;
    const role = effectiveRole === 'banned' ? 'student' as const : effectiveRole as 'admin' | 'student';
    return canAccessTests(profile, role);
  }, [profile, effectiveRole, loading, isBanned]);

  const trialExpiredNeedsPremiumFlag = useMemo(() => {
    if (loading || !user) return false;
    const role = effectiveRole === 'banned' ? 'student' as const : effectiveRole as 'admin' | 'student';
    return trialExpiredNeedsPremium(profile, role);
  }, [profile, effectiveRole, loading, user]);

  const signIn = async (email: string, password: string) => {
    try {
      // Debug: Log credentials (trim whitespace)
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      
      console.log('DEBUG AUTH: Attempting sign in with:');
      console.log('  Email:', trimmedEmail);
      console.log('  Password length:', trimmedPassword.length);
      console.log('  Auth config:', {
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      });
      
      await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
    } catch (error: any) {
      console.error('Firebase Auth Error Code:', error.code, 'Message:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: fullName ?? undefined
        });
        
        // Create user profile in Firestore with 7-day trial
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);
        
        const profileData: Profile = {
          id: userCredential.user.uid,
          email: email,
          full_name: fullName,
          role: 'student',
          is_premium: false,
          premium_until: trialEndDate.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        await setDoc(doc(db, 'profiles', userCredential.user.uid), profileData);
      }

      return { needsEmailConfirmation: false };
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (user) {
        await recordLogout(user.uid);
      }
      
      // Clear local state first for instant feedback
      setUser(null);
      setProfile(null);
      setLoading(true);
      
      // Then sign out from Firebase
      await firebaseSignOut(auth);
      
      // Clear any cached data
      cache.clear();
      setLoading(false);
    } catch (error) {
      console.error('Sign out error:', error);
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
    canAccessTests: canAccessTestsValue,
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