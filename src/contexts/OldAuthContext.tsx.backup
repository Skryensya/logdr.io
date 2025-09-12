"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { initializeUserPreferences } from "@/lib/logdrioDB";

interface User {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isFirstTimeLogin: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  markFirstTimeLoginComplete: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isFirstTimeLogin: false,
    isLoading: true,
  });

  useEffect(() => {
    if (status === "loading") {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      return;
    }

    if (session?.user) {
      const userEmail = session.user.email;
      const hasLoggedInBefore = localStorage.getItem(`user_${userEmail}_logged_before`);
      const isFirstTime = !hasLoggedInBefore;

      if (isFirstTime) {
        localStorage.setItem(`user_${userEmail}_logged_before`, "true");
      }

      setAuthState({
        user: session.user,
        isAuthenticated: true,
        isFirstTimeLogin: isFirstTime,
        isLoading: false,
      });

      // Log lifecycle events
      if (isFirstTime) {
        console.log("🎉 First time login for:", userEmail);
        onFirstTimeLogin(session.user);
      } else {
        console.log("🔄 Returning user login:", userEmail);
        onLogin(session.user);
      }
    } else {
      // Check if user was previously logged in to detect logout
      const wasAuthenticated = authState.isAuthenticated;
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isFirstTimeLogin: false,
        isLoading: false,
      });

      if (wasAuthenticated) {
        console.log("👋 User logged out");
        onLogout();
      }
    }
  }, [session, status]);

  const markFirstTimeLoginComplete = () => {
    setAuthState(prev => ({ ...prev, isFirstTimeLogin: false }));
  };

  // Lifecycle event handlers
  const onLogin = async (user: User) => {
    // Add custom logic for regular login
    console.log("User logged in:", user);
    
    // Initialize user preferences
    if (user.email) {
      try {
        await initializeUserPreferences(user.email);
      } catch (error) {
        console.error("Error initializing user preferences:", error);
      }
    }
  };

  const onFirstTimeLogin = async (user: User) => {
    // Add custom logic for first-time login
    console.log("First time user:", user);
    
    // Initialize user preferences for first-time users
    if (user.email) {
      try {
        await initializeUserPreferences(user.email);
        console.log("User preferences created for first-time user");
      } catch (error) {
        console.error("Error creating preferences for first-time user:", error);
      }
    }
    
    // You could show onboarding, track analytics, etc.
  };

  const onLogout = () => {
    // Add custom logic for logout
    console.log("User logged out");
    // Clear any user-specific data, analytics, etc.
  };

  return (
    <AuthContext.Provider value={{ ...authState, markFirstTimeLoginComplete }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthContextProvider");
  }
  return context;
}