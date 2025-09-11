"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export default function SessionTimer() {
  const { data: session, status } = useSession();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpiring, setIsExpiring] = useState(false);

  useEffect(() => {
    if (!session?.expires) return;

    const updateTimer = () => {
      const expirationTime = new Date(session.expires).getTime();
      const currentTime = Date.now();
      const remaining = Math.max(0, expirationTime - currentTime);
      
      setTimeRemaining(remaining);
      
      // Mark as expiring if less than 5 minutes left
      setIsExpiring(remaining < 5 * 60 * 1000);
      
      // Auto logout when expired
      if (remaining <= 0) {
        console.log("Session expired, logging out...");
        signOut({ callbackUrl: "/" });
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [session?.expires]);

  // Don't show if not authenticated
  if (status !== "authenticated" || !session) {
    return null;
  }

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusColor = () => {
    if (timeRemaining < 2 * 60 * 1000) { // Less than 2 minutes
      return "text-red-600 dark:text-red-400";
    } else if (timeRemaining < 10 * 60 * 1000) { // Less than 10 minutes
      return "text-orange-600 dark:text-orange-400";
    } else {
      return "text-green-600 dark:text-green-400";
    }
  };

  const getIcon = () => {
    if (timeRemaining < 2 * 60 * 1000) {
      return "⚠️";
    } else if (timeRemaining < 10 * 60 * 1000) {
      return "⏰";
    } else {
      return "✅";
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${
      isExpiring 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getIcon()}</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sesión activa
          </span>
        </div>
        <div className={`text-sm font-mono ${getStatusColor()}`}>
          {formatTime(timeRemaining)}
        </div>
      </div>
      
      {isExpiring && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
          Tu sesión expirará pronto. Guarda tu trabajo.
        </div>
      )}
      
      <div className="mt-2">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
          <div
            className={`h-1 rounded-full transition-all duration-1000 ${
              timeRemaining < 2 * 60 * 1000 
                ? 'bg-red-500' 
                : timeRemaining < 10 * 60 * 1000 
                ? 'bg-orange-500' 
                : 'bg-green-500'
            }`}
            style={{
              width: `${Math.max(0, (timeRemaining / (60 * 60 * 1000)) * 100)}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}