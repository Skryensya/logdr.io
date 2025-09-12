"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signIn } from 'next-auth/react';

interface AuthGateProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
  onGuestLogin?: () => Promise<void>;
}

export function AuthGate({ isAuthenticated, isLoading, error, onGuestLogin }: AuthGateProps) {
  // If authenticated, don't render anything (let children render)
  if (isAuthenticated) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show sign-in prompt
  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Welcome to Logdrio</CardTitle>
          <CardDescription>
            Sign in to access your personal finance dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <div className="space-y-3">
            <Button
              onClick={() => signIn('google')}
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {onGuestLogin && (
              <Button
                onClick={onGuestLogin}
                variant="outline"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                <span className="mr-2">👤</span>
                Continue as Guest
              </Button>
            )}
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
            {onGuestLogin && (
              <p className="text-xs text-gray-400">
                Guest mode: Data is stored locally and will be lost when you clear browser data
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}