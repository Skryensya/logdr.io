"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { pinGate, PINUtils } from '@/lib/auth/pin-gate';

interface PINSetupProps {
  userId: string;
  onComplete: (success: boolean) => void;
  onCancel?: () => void;
  mode?: 'setup' | 'change';
  currentPIN?: string;
}

export function PINSetup({ 
  userId, 
  onComplete, 
  onCancel, 
  mode = 'setup',
  currentPIN 
}: PINSetupProps) {
  const [pin, setPIN] = useState('');
  const [confirmPIN, setConfirmPIN] = useState('');
  const [oldPIN, setOldPIN] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors([]);

    try {
      // Validate PIN
      const validation = PINUtils.validatePINStrength(pin);
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }

      // Check if PINs match
      if (pin !== confirmPIN) {
        setErrors(['PINs do not match']);
        return;
      }

      let success = false;

      if (mode === 'setup') {
        // Setup new PIN
        await pinGate.setupPIN(pin, userId);
        success = true;
      } else if (mode === 'change') {
        // Change existing PIN
        if (!oldPIN) {
          setErrors(['Current PIN is required']);
          return;
        }
        success = await pinGate.changePIN(oldPIN, pin, userId);
        if (!success) {
          setErrors(['Current PIN is incorrect']);
          return;
        }
      }

      onComplete(success);
    } catch (error) {
      console.error('PIN setup error:', error);
      setErrors([error instanceof Error ? error.message : 'Failed to setup PIN']);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePINChange = (value: string) => {
    // Only allow digits and limit length
    const cleanValue = value.replace(/\D/g, '').substring(0, 20);
    setPIN(cleanValue);
    
    // Clear errors when user types
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === 'setup' ? 'Setup PIN' : 'Change PIN'}
        </CardTitle>
        <CardDescription>
          {mode === 'setup' 
            ? 'Create a PIN to secure your Logdrio sessions'
            : 'Enter your current PIN and choose a new one'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'change' && (
            <div className="space-y-2">
              <Label htmlFor="old-pin">Current PIN</Label>
              <input
                id="old-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={oldPIN}
                onChange={(e) => setOldPIN(e.target.value)}
                className="w-full p-3 text-center text-2xl tracking-widest font-mono border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••"
                maxLength={20}
                disabled={isLoading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-pin">
              {mode === 'setup' ? 'PIN' : 'New PIN'}
            </Label>
            <input
              id="new-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => handlePINChange(e.target.value)}
              className="w-full p-3 text-center text-2xl tracking-widest font-mono border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••"
              maxLength={20}
              disabled={isLoading}
              required
            />
            <p className="text-sm text-gray-600">
              Minimum 4 digits. Avoid simple patterns like 1234 or 1111.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-pin">Confirm PIN</Label>
            <input
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={confirmPIN}
              onChange={(e) => setConfirmPIN(e.target.value.replace(/\D/g, '').substring(0, 20))}
              className="w-full p-3 text-center text-2xl tracking-widest font-mono border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••"
              maxLength={20}
              disabled={isLoading}
              required
            />
          </div>

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || !pin || !confirmPIN || (mode === 'change' && !oldPIN)}
            >
              {isLoading ? 'Setting up...' : mode === 'setup' ? 'Setup PIN' : 'Change PIN'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}