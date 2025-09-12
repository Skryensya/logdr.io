"use client";

import { useState } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LoginModal } from './LoginModal';

export default function AuthStatus() {
  const { 
    isAuthenticated,
    isAnonymous,
    isLoading,
    user,
    error,
    logout
  } = useAuth();
  
  const [showLoginModal, setShowLoginModal] = useState(false);

  if (isLoading) {
    return <div className="text-gray-500">Loading auth status...</div>;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 className="font-medium">Auth Status</h3>
        <p className="text-gray-600 dark:text-gray-400">Not authenticated</p>
        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">{isAnonymous ? 'Guest Session' : 'Active Session'}</h3>
          <div className={`px-3 py-1 rounded-md text-sm border ${
            isAnonymous 
              ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800'
              : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
          }`}>
            {isAnonymous ? 'Guest Mode' : 'Authenticated'}
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {user.name || user.email?.split('@')[0]} ({user.email})
        </p>
        
        {isAnonymous && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-yellow-950 dark:border-yellow-800">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>Note:</strong> You're using guest mode. Your data is stored locally and will be lost if you clear browser data.
            </p>
          </div>
        )}
        
        <div className="flex gap-2">
          {isAnonymous && (
            <Button
              onClick={() => setShowLoginModal(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Upgrade Account
            </Button>
          )}
          
          <Button
            onClick={logout}
            variant="outline"
            size="sm"
          >
            {isAnonymous ? 'Exit Guest Mode' : 'Sign Out'}
          </Button>
        </div>
      </div>
      
      {/* Login Modal */}
      {isAnonymous && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          title="Upgrade Your Account"
          description="Create a permanent account to save your data and access it from any device"
        />
      )}
    </div>
  );
}