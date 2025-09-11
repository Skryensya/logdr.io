"use client";

import { useState, useEffect } from 'react';
import { getUserPreferences, updateUserThemeMode, type Preferences } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';

export function usePreferences() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences when user is authenticated
  useEffect(() => {
    async function loadPreferences() {
      if (!isAuthenticated || !user?.email || authLoading) {
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        const prefs = await getUserPreferences(user.email);
        setPreferences(prefs);
      } catch (error) {
        console.error('Error loading preferences:', error);
        setError('Failed to load preferences');
      } finally {
        setIsLoading(false);
      }
    }

    loadPreferences();
  }, [isAuthenticated, user?.email, authLoading]);

  // Update theme mode
  const setThemeMode = async (themeMode: 'light' | 'dark' | 'auto') => {
    if (!isAuthenticated || !user?.email) {
      throw new Error('User must be authenticated to update preferences');
    }

    try {
      await updateUserThemeMode(user.email, themeMode);
      
      // Update local state
      if (preferences) {
        setPreferences({
          ...preferences,
          themeMode
        });
      }
    } catch (error) {
      console.error('Error setting theme mode:', error);
      throw error;
    }
  };

  return {
    preferences: isAuthenticated ? preferences : null,
    themeMode: isAuthenticated ? (preferences?.themeMode || 'auto') : 'auto',
    setThemeMode,
    isLoading: authLoading || isLoading,
    error,
    isAuthenticated
  };
}