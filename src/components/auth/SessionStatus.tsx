"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AuthState } from '@/types/database';
import { PINUtils } from '@/lib/auth/pin-gate';

interface SessionStatusProps {
  authState: AuthState;
  jwtTimeRemaining: number; // milliseconds
  gateTimeRemaining: number; // milliseconds
  onExtendSession?: () => void;
  onRefreshJWT?: () => void;
  className?: string;
}

export function SessionStatus({
  authState,
  jwtTimeRemaining,
  gateTimeRemaining,
  onExtendSession,
  onRefreshJWT,
  className = ''
}: SessionStatusProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update time every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate actual remaining times based on current time
  const actualJWTRemaining = Math.max(0, jwtTimeRemaining - (Date.now() - currentTime));
  const actualGateRemaining = Math.max(0, gateTimeRemaining - (Date.now() - currentTime));

  // Don't show if not in an authenticated state
  if (![AuthState.JWT_OK, AuthState.GATED, AuthState.UNLOCKED].includes(authState)) {
    return null;
  }

  // Format time remaining
  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return 'Expired';
    
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    
    return `${seconds}s`;
  };

  // Get urgency level for styling
  const getUrgencyLevel = (ms: number): 'normal' | 'warning' | 'critical' => {
    const minutes = ms / (1000 * 60);
    if (minutes <= 1) return 'critical';
    if (minutes <= 5) return 'warning';
    return 'normal';
  };

  const jwtUrgency = getUrgencyLevel(actualJWTRemaining);
  const gateUrgency = getUrgencyLevel(actualGateRemaining);

  // Show JWT status for all authenticated states
  const showJWT = actualJWTRemaining > 0 || jwtUrgency === 'critical';
  
  // Show gate status only for UNLOCKED state
  const showGate = authState === AuthState.UNLOCKED && 
                  (actualGateRemaining > 0 || gateUrgency === 'critical');

  if (!showJWT && !showGate) {
    return null;
  }

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4 space-y-3">
        {/* JWT Session Status */}
        {showJWT && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Session:</span>
              <span 
                className={`text-sm ${
                  jwtUrgency === 'critical' ? 'text-red-600 font-semibold animate-pulse' :
                  jwtUrgency === 'warning' ? 'text-yellow-600 font-medium' :
                  'text-green-600'
                }`}
              >
                {formatTimeRemaining(actualJWTRemaining)}
              </span>
              {jwtUrgency === 'critical' && actualJWTRemaining <= 0 && (
                <span className="text-xs text-red-500">(Expired)</span>
              )}
            </div>
            
            {onRefreshJWT && jwtUrgency !== 'normal' && (
              <Button
                size="sm"
                variant={jwtUrgency === 'critical' ? 'destructive' : 'outline'}
                onClick={onRefreshJWT}
                className="h-7 px-2 text-xs"
              >
                Refresh
              </Button>
            )}
          </div>
        )}

        {/* Gate Session Status */}
        {showGate && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                {authState === AuthState.UNLOCKED ? 'Unlocked:' : 'Gate:'}
              </span>
              <span 
                className={`text-sm ${
                  gateUrgency === 'critical' ? 'text-red-600 font-semibold animate-pulse' :
                  gateUrgency === 'warning' ? 'text-yellow-600 font-medium' :
                  'text-green-600'
                }`}
              >
                {formatTimeRemaining(actualGateRemaining)}
              </span>
              {gateUrgency === 'critical' && actualGateRemaining <= 0 && (
                <span className="text-xs text-red-500">(Expired)</span>
              )}
            </div>
            
            {onExtendSession && actualGateRemaining > 0 && (
              <Button
                size="sm"
                variant={gateUrgency === 'warning' ? 'default' : 'outline'}
                onClick={onExtendSession}
                className="h-7 px-2 text-xs"
              >
                Extend
              </Button>
            )}
          </div>
        )}

        {/* Combined urgency warnings */}
        {(jwtUrgency === 'critical' || gateUrgency === 'critical') && (
          <div className="bg-red-50 border border-red-200 rounded-md p-2">
            <p className="text-red-800 text-xs font-medium text-center">
              {jwtUrgency === 'critical' && gateUrgency === 'critical' 
                ? 'Session and access expiring soon!' 
                : jwtUrgency === 'critical' 
                ? 'Session expiring soon!'
                : 'Access expiring soon!'
              }
            </p>
          </div>
        )}
        
        {(jwtUrgency === 'warning' || gateUrgency === 'warning') && 
         !(jwtUrgency === 'critical' || gateUrgency === 'critical') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
            <p className="text-yellow-800 text-xs text-center">
              Consider refreshing your session
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Hook for session timing
 */
export function useSessionTiming(
  jwtExpiresAt?: number,
  gateExpiresAt?: number
): {
  jwtTimeRemaining: number;
  gateTimeRemaining: number;
  isJWTExpiring: boolean;
  isGateExpiring: boolean;
} {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const jwtTimeRemaining = jwtExpiresAt ? Math.max(0, jwtExpiresAt - now) : 0;
  const gateTimeRemaining = gateExpiresAt ? Math.max(0, gateExpiresAt - now) : 0;

  const isJWTExpiring = jwtTimeRemaining > 0 && jwtTimeRemaining <= 5 * 60 * 1000; // 5 minutes
  const isGateExpiring = gateTimeRemaining > 0 && gateTimeRemaining <= 2 * 60 * 1000; // 2 minutes

  return {
    jwtTimeRemaining,
    gateTimeRemaining,
    isJWTExpiring,
    isGateExpiring
  };
}