import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  getEffectiveRole,
  hasActivePremium,
  canAccessTests as canAccessTestsFn,
  trialExpiredNeedsPremium as trialExpiredFn,
} from '../lib/authUtils';
import type { Profile } from '../lib/authUtils';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      // Clean up previous profile listener
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);

        // Listen to both 'users' (for isPremium) and 'profiles' collections
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const profileDocRef = doc(db, 'profiles', firebaseUser.uid);

        // Listen to users collection for userData (isPremium field)
        onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        });

        // Listen to profiles collection for full profile
        profileUnsub = onSnapshot(profileDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile({ id: docSnap.id, ...docSnap.data() } as Profile);
          } else {
            // Fallback: construct profile from firebase user data
            setProfile({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              full_name: firebaseUser.displayName || 'Student',
              role: 'student',
              is_premium: false,
              created_at: firebaseUser.metadata.creationTime || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        });
      } else {
        setUser(null);
        setUserData(null);
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserData(null);
    setProfile(null);
  };

  const effectiveRole = getEffectiveRole(profile, user?.email);
  const isBanned = effectiveRole === 'banned';
  const isPremium = hasActivePremium(profile) || userData?.isPremium || false;
  const canAccessTests = canAccessTestsFn(profile, effectiveRole === 'banned' ? 'student' : effectiveRole);
  const trialExpiredNeedsPremium = trialExpiredFn(profile, effectiveRole === 'banned' ? 'student' : effectiveRole);

  const value = {
    user,
    userData,
    profile,
    loading,
    signOut,
    effectiveRole: isBanned ? 'banned' : effectiveRole,
    isBanned,
    isPremium,
    canAccessTests,
    trialExpiredNeedsPremium,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);