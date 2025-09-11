"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function useThemeEffects() {
  const { theme, resolvedTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [themeState, setThemeState] = useState({
    isDark: false,
    isLight: false,
    resolvedTheme: 'light' as string
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update theme state when resolvedTheme changes
  useEffect(() => {
    if (mounted && resolvedTheme) {
      setThemeState({
        isDark: resolvedTheme === 'dark',
        isLight: resolvedTheme === 'light',
        resolvedTheme: resolvedTheme
      });
    }
  }, [mounted, resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Always update when system theme changes, regardless of current theme setting
      const newResolvedTheme = e.matches ? 'dark' : 'light';
      
      // If theme is 'system', update immediately
      if (theme === 'system' || theme === 'auto') {
        setThemeState(prev => ({
          ...prev,
          isDark: newResolvedTheme === 'dark',
          isLight: newResolvedTheme === 'light',
          resolvedTheme: newResolvedTheme
        }));
      }
    };

    // Set initial state
    const currentSystemTheme = mediaQuery.matches ? 'dark' : 'light';
    if (theme === 'system' || theme === 'auto') {
      setThemeState(prev => ({
        ...prev,
        isDark: currentSystemTheme === 'dark',
        isLight: currentSystemTheme === 'light',
        resolvedTheme: currentSystemTheme
      }));
    }

    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted, theme]);

  // Get theme status for UI
  const getThemeStatus = () => {
    if (!mounted) return { 
      text: 'Cargando...', 
      isDark: false, 
      isLight: false,
      currentTheme: theme,
      resolvedTheme: 'light'
    };
    
    const currentResolved = themeState.resolvedTheme;
    
    return {
      text: themeState.isDark ? 'Modo oscuro activo' : 'Modo claro activo',
      isDark: themeState.isDark,
      isLight: themeState.isLight,
      currentTheme: theme,
      resolvedTheme: currentResolved
    };
  };

  return {
    isDarkMode: themeState.isDark,
    isLightMode: themeState.isLight,
    mounted,
    themeStatus: getThemeStatus()
  };
}