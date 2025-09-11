"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { Session } from "next-auth";

interface User {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface AuthLifecycleCallbacks {
  onLogin?: (user: User) => void;
  onFirstTimeLogin?: (user: User) => void;
  onLogout?: () => void;
}

export function useAuthLifecycle(callbacks: AuthLifecycleCallbacks = {}) {
  const { data: session, status } = useSession();
  const prevSessionRef = useRef<Session | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (status === "loading") return;

    const prevSession = prevSessionRef.current;
    const currentSession = session;

    // User logged in
    if (!prevSession && currentSession && currentSession.user) {
      console.log("User logged in:", currentSession.user);
      callbacks.onLogin?.(currentSession.user);

      // Check if this is first time login by checking account creation
      const isFirstTime = checkIfFirstTimeLogin(currentSession);
      if (isFirstTime) {
        console.log("First time login detected");
        callbacks.onFirstTimeLogin?.(currentSession.user);
      }
    }

    // User logged out
    if (prevSession && !currentSession && hasInitializedRef.current) {
      console.log("User logged out");
      callbacks.onLogout?.();
    }

    prevSessionRef.current = currentSession;
    hasInitializedRef.current = true;
  }, [session, status, callbacks]);

  return { session, status };
}

function checkIfFirstTimeLogin(session: Session): boolean {
  if (!session.user?.email) return false;
  
  // Check localStorage for previous login
  const hasLoggedInBefore = localStorage.getItem(
    `user_${session.user.email}_logged_before`
  );

  if (!hasLoggedInBefore) {
    // Mark user as having logged in before
    localStorage.setItem(`user_${session.user.email}_logged_before`, "true");
    return true;
  }

  return false;
}
