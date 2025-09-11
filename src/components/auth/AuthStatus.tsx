"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useAuthLifecycle } from "@/hooks/useAuthLifecycle";

export default function AuthStatus() {
  const { user, isAuthenticated, isFirstTimeLogin, isLoading } = useAuth();

  // Use the lifecycle hook to handle auth events
  useAuthLifecycle({
    onLogin: (user) => {
      console.log("🔑 Login event captured:", user.email);
      // Add custom login logic here
    },
    onFirstTimeLogin: (user) => {
      console.log("🎊 First time login event captured:", user.email);
      // Show welcome message, onboarding, etc.
      alert(`Welcome to Logdrio, ${user.name}! This is your first time logging in.`);
    },
    onLogout: () => {
      console.log("👋 Logout event captured");
      // Add custom logout logic here
      alert("You have been logged out. See you soon!");
    },
  });

  if (isLoading) {
    return <div className="text-gray-500">Loading auth status...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 className="font-medium">Auth Status</h3>
        <p className="text-gray-600 dark:text-gray-400">Not authenticated</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg">
      <h3 className="font-medium text-green-800 dark:text-green-200">Auth Status</h3>
      <p className="text-green-700 dark:text-green-300">
        Authenticated as: {user?.name} ({user?.email})
      </p>
      {isFirstTimeLogin && (
        <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900 rounded">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            🎉 First time login detected! Welcome aboard!
          </p>
        </div>
      )}
    </div>
  );
}