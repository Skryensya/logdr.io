"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WebAuthnUtils } from '@/lib/auth/webauthn-gate';

interface WebAuthnUnlockProps {
  onUnlock: () => Promise<boolean>;
  isLoading?: boolean;
  error?: string;
  onCancel?: () => void;
  showCancel?: boolean;
  onFallbackToPIN?: () => void;
}

export function WebAuthnUnlock({ 
  onUnlock, 
  isLoading = false, 
  error,
  onCancel,
  showCancel = false,
  onFallbackToPIN
}: WebAuthnUnlockProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    
    try {
      await onUnlock();
    } catch (error) {
      console.error('WebAuthn unlock error:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>🔐 Biometric Authentication</CardTitle>
        <CardDescription>
          Use your fingerprint, face, or device authentication to unlock
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              {isAuthenticating ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              ) : (
                <span className="text-4xl">🔒</span>
              )}
            </div>
            
            {isAuthenticating ? (
              <div className="space-y-2">
                <h3 className="font-medium">Authenticating...</h3>
                <p className="text-sm text-gray-600">
                  Complete the authentication on your device
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="font-medium">Ready to Authenticate</h3>
                <p className="text-sm text-gray-600">
                  Tap the button below to start biometric authentication
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h4 className="font-medium text-red-800 mb-1">Authentication Failed</h4>
              <p className="text-sm text-red-700">{error}</p>
              
              {/* Common error solutions */}
              <div className="mt-3 text-xs text-red-600">
                <p className="font-medium mb-1">Try:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Make sure your sensor is clean</li>
                  <li>Use a registered finger/face</li>
                  <li>Try again with better positioning</li>
                </ul>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleAuthenticate}
              className="w-full py-3"
              disabled={isLoading || isAuthenticating}
            >
              {isAuthenticating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Authenticate'
              )}
            </Button>

            {onFallbackToPIN && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onFallbackToPIN}
                disabled={isLoading || isAuthenticating}
              >
                Use PIN Instead
              </Button>
            )}

            {showCancel && onCancel && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onCancel}
                disabled={isLoading || isAuthenticating}
              >
                Cancel
              </Button>
            )}
          </div>

          <div className="bg-gray-50 rounded-md p-4 text-xs text-gray-600 space-y-2">
            <h4 className="font-medium text-gray-800">Supported methods:</h4>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="flex items-center justify-center space-x-1">
                <span>👆</span>
                <span>Fingerprint</span>
              </div>
              <div className="flex items-center justify-center space-x-1">
                <span>👤</span>
                <span>Face ID</span>
              </div>
              <div className="flex items-center justify-center space-x-1">
                <span>📱</span>
                <span>Device PIN</span>
              </div>
              <div className="flex items-center justify-center space-x-1">
                <span>🔑</span>
                <span>Pattern</span>
              </div>
            </div>
          </div>

          {/* Privacy note */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              🔒 Your biometric data never leaves your device
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}