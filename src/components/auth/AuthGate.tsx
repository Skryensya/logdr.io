"use client";

import { useState, useEffect } from 'react';
import { AuthState } from '@/types/database';
import { PINUnlock } from './PINUnlock';
import { WebAuthnUnlock } from './WebAuthnUnlock';
import { PINSetup } from './PINSetup';
import { WebAuthnSetup } from './WebAuthnSetup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AuthGateProps {
  authState: AuthState;
  userId?: string;
  userEmail?: string;
  userDisplayName?: string;
  availableMethods: {
    pin: boolean;
    webauthn: boolean;
    webauthnSupported: boolean;
  };
  onPINUnlock: (pin: string) => Promise<boolean>;
  onWebAuthnUnlock: () => Promise<boolean>;
  onSetupComplete: () => void;
  onLogout?: () => void;
  isLoading?: boolean;
  error?: string;
}

type SetupMode = 'choice' | 'pin' | 'webauthn' | null;

export function AuthGate({
  authState,
  userId,
  userEmail,
  userDisplayName,
  availableMethods,
  onPINUnlock,
  onWebAuthnUnlock,
  onSetupComplete,
  onLogout,
  isLoading = false,
  error
}: AuthGateProps) {
  const [setupMode, setSetupMode] = useState<SetupMode>(null);
  const [unlockMethod, setUnlockMethod] = useState<'pin' | 'webauthn'>('pin');
  const [attempts, setAttempts] = useState(0);

  // Reset attempts on successful unlock or state change
  useEffect(() => {
    if (authState === AuthState.UNLOCKED) {
      setAttempts(0);
    }
  }, [authState]);

  // Determine if we need setup
  const needsSetup = !availableMethods.pin && !availableMethods.webauthn;

  // Handle PIN unlock with attempt tracking
  const handlePINUnlock = async (pin: string): Promise<boolean> => {
    try {
      const success = await onPINUnlock(pin);
      if (!success) {
        setAttempts(prev => prev + 1);
      }
      return success;
    } catch (error) {
      setAttempts(prev => prev + 1);
      return false;
    }
  };

  // Handle WebAuthn unlock with attempt tracking
  const handleWebAuthnUnlock = async (): Promise<boolean> => {
    try {
      const success = await onWebAuthnUnlock();
      if (!success) {
        setAttempts(prev => prev + 1);
      }
      return success;
    } catch (error) {
      setAttempts(prev => prev + 1);
      return false;
    }
  };

  // Setup completion handler
  const handleSetupComplete = (success: boolean) => {
    if (success) {
      setSetupMode(null);
      onSetupComplete();
    }
  };

  // If we're in setup mode, show setup components
  if (setupMode === 'pin' && userId) {
    return (
      <PINSetup
        userId={userId}
        onComplete={handleSetupComplete}
        onCancel={() => setSetupMode(needsSetup ? 'choice' : null)}
      />
    );
  }

  if (setupMode === 'webauthn' && userId && userEmail && userDisplayName) {
    return (
      <WebAuthnSetup
        userId={userId}
        userDisplayName={userDisplayName}
        userEmail={userEmail}
        onComplete={handleSetupComplete}
        onCancel={() => setSetupMode(needsSetup ? 'choice' : null)}
      />
    );
  }

  // Show setup choice if needed
  if (setupMode === 'choice' || (needsSetup && authState === AuthState.GATED)) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">🔐 Secure Your Account</CardTitle>
          <CardDescription className="text-center">
            Choose a method to secure your Logdrio sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={() => setSetupMode('pin')}
              className="w-full h-16 text-left flex items-center space-x-4"
              variant="outline"
              disabled={isLoading}
            >
              <span className="text-2xl">📱</span>
              <div className="flex-1">
                <div className="font-medium">PIN</div>
                <div className="text-sm text-gray-500">4+ digit numeric code</div>
              </div>
            </Button>

            {availableMethods.webauthnSupported && (
              <Button
                onClick={() => setSetupMode('webauthn')}
                className="w-full h-16 text-left flex items-center space-x-4"
                variant="outline"
                disabled={isLoading}
              >
                <span className="text-2xl">👆</span>
                <div className="flex-1">
                  <div className="font-medium">Biometric</div>
                  <div className="text-sm text-gray-500">Fingerprint, Face ID, etc.</div>
                </div>
              </Button>
            )}

            <div className="text-center space-y-2">
              <p className="text-xs text-gray-500">
                You can always change this later in settings
              </p>
              
              {onLogout && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  disabled={isLoading}
                  className="text-xs"
                >
                  Sign out instead
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show unlock interface if methods are available
  if (authState === AuthState.GATED && (availableMethods.pin || availableMethods.webauthn)) {
    // If both methods are available, show tabs
    if (availableMethods.pin && availableMethods.webauthn) {
      return (
        <div className="w-full max-w-md mx-auto">
          <Tabs value={unlockMethod} onValueChange={(value) => setUnlockMethod(value as 'pin' | 'webauthn')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="pin">PIN</TabsTrigger>
              <TabsTrigger value="webauthn">Biometric</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pin">
              <PINUnlock
                onUnlock={handlePINUnlock}
                isLoading={isLoading}
                error={unlockMethod === 'pin' ? error : undefined}
                attempts={attempts}
                onCancel={onLogout}
                showCancel={!!onLogout}
              />
            </TabsContent>
            
            <TabsContent value="webauthn">
              <WebAuthnUnlock
                onUnlock={handleWebAuthnUnlock}
                isLoading={isLoading}
                error={unlockMethod === 'webauthn' ? error : undefined}
                onFallbackToPIN={() => setUnlockMethod('pin')}
                onCancel={onLogout}
                showCancel={!!onLogout}
              />
            </TabsContent>
          </Tabs>
        </div>
      );
    }

    // Show single method
    if (availableMethods.pin) {
      return (
        <PINUnlock
          onUnlock={handlePINUnlock}
          isLoading={isLoading}
          error={error}
          attempts={attempts}
          onCancel={onLogout}
          showCancel={!!onLogout}
        />
      );
    }

    if (availableMethods.webauthn) {
      return (
        <WebAuthnUnlock
          onUnlock={handleWebAuthnUnlock}
          isLoading={isLoading}
          error={error}
          onCancel={onLogout}
          showCancel={!!onLogout}
        />
      );
    }
  }

  // Fallback: show current state
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Authentication Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">
              {authState === AuthState.UNLOCKED ? '✅' : 
               authState === AuthState.JWT_OK ? '🔓' :
               authState === AuthState.GATED ? '🔐' :
               authState === AuthState.JWT_STALE ? '⏰' :
               authState === AuthState.ERROR ? '❌' : '❓'}
            </span>
          </div>
          
          <div>
            <h3 className="font-medium">
              {authState === AuthState.UNLOCKED ? 'Unlocked' :
               authState === AuthState.JWT_OK ? 'Authenticated' :
               authState === AuthState.GATED ? 'Locked' :
               authState === AuthState.JWT_STALE ? 'Session Expired' :
               authState === AuthState.ERROR ? 'Authentication Error' :
               authState === AuthState.ANON ? 'Not Signed In' : 'Unknown State'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              State: {authState}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            {authState === AuthState.GATED && !needsSetup && (
              <Button
                onClick={() => setSetupMode('choice')}
                variant="outline"
                size="sm"
              >
                Setup Authentication
              </Button>
            )}
            
            {onLogout && (
              <Button
                onClick={onLogout}
                variant="ghost"
                size="sm"
              >
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}