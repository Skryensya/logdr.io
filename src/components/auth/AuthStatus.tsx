"use client";

import { useAuth } from "@/contexts/AuthContext";
import { AuthState } from "@/types/database";
import { AuthGate } from "./AuthGate";
import { SessionStatus } from "./SessionStatus";
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-foreground">Sesión Activa</h3>
            <p className="text-sm text-muted-foreground">
              {userDisplayName} ({userEmail})
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isUnlocked ? 'bg-green-500' : 'bg-blue-500'
            }`} />
            <span className="text-sm font-medium">
              {isUnlocked ? 'Desbloqueado' : 'Autenticado'}
            </span>
          </div>
        </div>
      </div>

      {/* Session status with timing */}
      {(isAuthenticated || isUnlocked) && (
        <SessionStatus
          authState={authState}
          jwtTimeRemaining={jwtTimeRemaining}
          gateTimeRemaining={gateTimeRemaining}
          onExtendSession={() => extendSession(5)}
          onRefreshJWT={refreshAuth}
        />
      )}
    </div>
  );
}