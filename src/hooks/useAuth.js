import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      setAuthLoading(false);
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      setUser(session?.user ?? null);
      setAuthLoading(false);
    }).catch((err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.warn('Auth init failed:', err);
      setUser(null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (settled) return;
      setUser(session?.user ?? null);
    });

    return () => {
      clearTimeout(timer);
      subscription?.unsubscribe();
    };
  }, []);

  const handleSignup = async (email, password) => {
    setAuthError('');
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogin = async (email, password) => {
    setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleGuest = () => {
    setGuestMode(true);
  };

  const exitGuest = () => {
    setGuestMode(false);
  };

  const saveToSupabase = useCallback(async (data) => {
    if (!user || guestMode || !supabase) return;
    try {
      const { error } = await supabase
        .from('users')
        .upsert({ id: user.id, ...data, updated_at: new Date().toISOString() });
      if (error) console.error('Failed to save:', error);
    } catch (err) {
      console.error('Failed to save to Supabase:', err);
    }
  }, [user, guestMode]);

  const loadUserData = useCallback(async () => {
    if (!user || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') console.error('Failed to load:', error);
      return data || null;
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
    saveToSupabase,
    loadUserData,
  };
}