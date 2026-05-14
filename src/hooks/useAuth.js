import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      setAuthLoading(false);
    }, 6000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      setUser(user);
      setAuthLoading(false);
    }, (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.warn('Auth error:', err);
      setUser(null);
      setAuthLoading(false);
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const handleSignup = async (email, password) => {
    setAuthError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogin = async (email, password) => {
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleGuest = () => {
    setGuestMode(true);
  };

  const exitGuest = () => {
    setGuestMode(false);
  };

  const saveToFirestore = useCallback(async (data) => {
    if (!user || guestMode) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, data, { merge: true });
    } catch (err) {
      console.error('Failed to save to Firestore:', err);
    }
  }, [user, guestMode]);

  const loadUserData = useCallback(async () => {
    if (!user) return null;
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (err) {
      console.error('Failed to load user data:', err);
      return null;
    }
  }, [user]);

  return {
    user,
    authLoading,
    authError,
    guestMode,
    handleSignup,
    handleLogin,
    handleLogout,
    handleGuest,
    exitGuest,
    saveToFirestore,
    loadUserData,
  };
}
