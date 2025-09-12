"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PINUtils } from '@/lib/auth/pin-gate';

interface PINUnlockProps {
  onUnlock: (pin: string) => Promise<boolean>;
  isLoading?: boolean;
  error?: string;
  attempts?: number;
  maxAttempts?: number;
  onCancel?: () => void;
  showCancel?: boolean;
}

export function PINUnlock({ 
  onUnlock, 
  isLoading = false, 
  error,
  attempts = 0,
  maxAttempts = 5,
  onCancel,
  showCancel = false
}: PINUnlockProps) {
  const [pin, setPIN] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pin || pin.length < 4) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const success = await onUnlock(pin);
      if (!success) {
        // Clear PIN on failure
        setPIN('');
        // Refocus input
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      }
    } catch (error) {
      console.error('PIN unlock error:', error);
      setPIN('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePINChange = (value: string) => {
    // Only allow digits and limit length
    const cleanValue = value.replace(/\D/g, '').substring(0, 20);
    setPIN(cleanValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && pin.length === 0) {
      // Prevent default backspace behavior when PIN is empty
      e.preventDefault();
    }
  };

  const remainingAttempts = maxAttempts - attempts;
  const isBlocked = remainingAttempts <= 0;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>🔐 Enter PIN</CardTitle>
        <CardDescription>
          Enter your PIN to unlock Logdrio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => handlePINChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full p-4 text-center text-3xl tracking-widest font-mono border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="••••"
                maxLength={20}
                disabled={isLoading || isSubmitting || isBlocked}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              
              {/* PIN dots visualization */}
              <div className="absolute inset-x-0 bottom-2 flex justify-center space-x-1">
                {[...Array(Math.max(4, pin.length))].map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      index < pin.length 
                        ? 'bg-blue-500' 
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-center">
                <p className="text-red-700 text-sm font-medium">{error}</p>
                {attempts > 0 && !isBlocked && (
                  <p className="text-red-600 text-xs mt-1">
                    {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                  </p>
                )}
              </div>
            )}

            {isBlocked && (
              <div className="bg-red-100 border border-red-300 rounded-md p-4 text-center">
                <p className="text-red-800 font-medium">Access Blocked</p>
                <p className="text-red-700 text-sm mt-1">
                  Too many failed attempts. Please try again later.
                </p>
              </div>
            )}

            {attempts > 0 && !isBlocked && !error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-center">
                <p className="text-yellow-800 text-sm">
                  {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full py-3 text-lg"
              disabled={isLoading || isSubmitting || !pin || pin.length < 4 || isBlocked}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Unlocking...</span>
                </div>
              ) : (
                'Unlock'
              )}
            </Button>

            {showCancel && onCancel && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onCancel}
                disabled={isLoading || isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>

          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              PIN is stored securely on your device only
            </p>
            
            {/* Quick tips */}
            <details className="text-left">
              <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                Having trouble?
              </summary>
              <div className="mt-2 p-3 bg-blue-50 rounded text-xs text-blue-800 space-y-1">
                <p>• Make sure you&apos;re entering the correct PIN</p>
                <p>• PIN is case-sensitive if it contains letters</p>
                <p>• Contact support if you forgot your PIN</p>
              </div>
            </details>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}