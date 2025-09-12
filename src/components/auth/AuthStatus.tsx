"use client";

import { useAuth } from "@/contexts/AuthContext";
import { AuthState } from "@/types/database";
import { AuthGate } from "./AuthGate";
import { useSession, signOut } from "next-auth/react";

export default function AuthStatus() {
  const { 
    authState, 
    isAuthenticated, 
    isUnlocked, 
    userEmail, 
    userDisplayName,
    availableAuthMethods,
    unlockWithPIN,
    unlockWithWebAuthn,
    isLoading,
    error,
    jwtTimeRemaining,
    gateTimeRemaining,
    refreshTokenTimeRemaining,
    extendSession,
    refreshAuth
  } = useAuth();
  
  const { data: session } = useSession();

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

  // Show auth gate if user is gated
  if (authState === AuthState.GATED) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
          <h3 className="font-medium text-yellow-800 dark:text-yellow-200">Authentication Required</h3>
          <p className="text-yellow-700 dark:text-yellow-300">
            Please unlock your session to continue
          </p>
        </div>
        
        <AuthGate
          authState={authState}
          userId={userEmail} // Using email as userId for now
          userEmail={userEmail}
          userDisplayName={userDisplayName}
          availableMethods={availableAuthMethods}
          onPINUnlock={unlockWithPIN}
          onWebAuthnUnlock={unlockWithWebAuthn}
          onSetupComplete={() => window.location.reload()}
          onLogout={() => signOut()}
          isLoading={isLoading}
          error={error}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg">
        <div className="space-y-2">
          <h3 className="font-medium text-foreground">Sesión Activa</h3>
          <p className="text-sm text-muted-foreground">
            {userDisplayName} ({userEmail})
          </p>
          {jwtTimeRemaining > 0 && (
            <p className="text-sm text-muted-foreground">
              Token JWT: {(() => {
                const totalSeconds = Math.floor(jwtTimeRemaining / 1000);
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
              })()}
            </p>
          )}
          {refreshTokenTimeRemaining > 0 && (
            <p className="text-sm text-muted-foreground">
              Refresh Token: {(() => {
                const totalSeconds = Math.floor(refreshTokenTimeRemaining / 1000);
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
              })()}
            </p>
          )}
        </div>
      </div>

    </div>
  );
}