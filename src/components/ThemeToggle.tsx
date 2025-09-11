"use client";

import { usePreferences } from '@/hooks/usePreferences';

export default function ThemeToggle() {
  const { themeMode, setThemeMode, isLoading, isAuthenticated, error } = usePreferences();

  // Don't show anything if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-gray-500">Loading theme preferences...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900 rounded-lg">
        <div className="text-red-800 dark:text-red-200">
          Error loading theme preferences: {error}
        </div>
      </div>
    );
  }

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'auto') => {
    try {
      await setThemeMode(newTheme);
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="font-medium mb-3">Theme Preferences</h3>
      <div className="space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Current theme: <span className="font-medium">{themeMode}</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleThemeChange('light')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              themeMode === 'light'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Light
          </button>
          <button
            onClick={() => handleThemeChange('dark')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              themeMode === 'dark'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Dark
          </button>
          <button
            onClick={() => handleThemeChange('auto')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              themeMode === 'auto'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Auto
          </button>
        </div>
      </div>
    </div>
  );
}