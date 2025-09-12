"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { webAuthnGate, WebAuthnUtils } from '@/lib/auth/webauthn-gate';

interface WebAuthnSetupProps {
  userId: string;
  userDisplayName: string;
  userEmail: string;
  onComplete: (success: boolean) => void;
  onCancel?: () => void;
}

export function WebAuthnSetup({ 
  userId, 
  userDisplayName, 
  userEmail,
  onComplete, 
  onCancel 
}: WebAuthnSetupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [platformAvailable, setPlatformAvailable] = useState<boolean | null>(null);

  useState(() => {
    // Check support on mount
    const checkSupport = async () => {
      const supported = webAuthnGate.isSupported();
      setIsSupported(supported);
      
      if (supported) {
        try {
          const available = await webAuthnGate.isPlatformAuthenticatorAvailable();
          setPlatformAvailable(available);
        } catch {
          setPlatformAvailable(false);
        }
      }
    };
    
    checkSupport();
  });

  const handleSetup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await webAuthnGate.register(
        userId,
        userDisplayName,
        userEmail,
        {
          userVerification: 'required',
          authenticatorAttachment: 'platform'
        }
      );

      onComplete(success);
    } catch (error) {
      console.error('WebAuthn setup error:', error);
      const errorMessage = error instanceof Error 
        ? WebAuthnUtils.getErrorMessage(error)
        : 'Failed to setup biometric authentication';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSupported === null) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">❌ Not Supported</CardTitle>
          <CardDescription className="text-center">
            Biometric authentication is not supported in this browser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Browser Requirements</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Use a modern browser (Chrome, Firefox, Safari, Edge)</li>
                <li>• Ensure your browser is up to date</li>
                <li>• Access the site via HTTPS</li>
              </ul>
            </div>
            
            {onCancel && (
              <Button
                variant="outline"
                className="w-full"
                onClick={onCancel}
              >
                Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (platformAvailable === false) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">⚠️ No Biometric Hardware</CardTitle>
          <CardDescription className="text-center">
            Your device doesn&apos;t have biometric authentication available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-800 mb-2">Supported Devices</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• MacBook with Touch ID</li>
                <li>• iPhone/iPad with Face ID or Touch ID</li>
                <li>• Android devices with fingerprint/face unlock</li>
                <li>• Windows Hello compatible devices</li>
              </ul>
            </div>
            
            {onCancel && (
              <Button
                variant="outline"
                className="w-full"
                onClick={onCancel}
              >
                Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">🔐 Setup Biometric Auth</CardTitle>
        <CardDescription className="text-center">
          Use your fingerprint, face, or device PIN to secure your Logdrio sessions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">🔒</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Secure & Convenient</h3>
              <p className="text-sm text-gray-600">
                Your biometric data stays on your device and is never sent to our servers
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h4 className="font-medium text-red-800 mb-1">Setup Failed</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleSetup}
              className="w-full py-3"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Setting up...</span>
                </div>
              ) : (
                'Setup Biometric Auth'
              )}
            </Button>

            {onCancel && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onCancel}
                disabled={isLoading}
              >
                Skip for Now
              </Button>
            )}
          </div>

          <div className="bg-gray-50 rounded-md p-4 text-xs text-gray-600 space-y-2">
            <h4 className="font-medium text-gray-800">How it works:</h4>
            <ol className="space-y-1 ml-4">
              <li>1. Your device will prompt for biometric verification</li>
              <li>2. A secure key is created and stored on your device</li>
              <li>3. Use your biometric to unlock Logdrio sessions</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}