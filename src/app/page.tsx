"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import MainLayout, { TabValue } from '@/components/layout/MainLayout';
import DashboardTab from '@/components/tabs/DashboardTab';
import AccountsTab from '@/components/tabs/AccountsTab';
import TransactionsTab from '@/components/tabs/TransactionsTab';
import CategoriesTab from '@/components/tabs/CategoriesTab';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabValue>('dashboard');
  const { isAuthenticated, isLoading, loginAsGuest } = useAuth();
  const { isInitializing, isInitialized, error } = useDatabase();

  const tabContents = {
    dashboard: <DashboardTab />,
    accounts: <AccountsTab />,
    transactions: <TransactionsTab />,
    categories: <CategoriesTab />
  };

  // Auto-login as guest when not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      loginAsGuest();
    }
  }, [isAuthenticated, isLoading, loginAsGuest]);

  // Show loading while initializing guest session
  if (!isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading Logdrio...</p>
        </div>
      </div>
    );
  }

  // Show loading while initializing database
  if (isInitializing || !isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">
            {error ? `Database Error: ${error}` : 'Initializing Database...'}
          </p>
        </div>
      </div>
    );
  }

  // Show main app
  return (
    <MainLayout 
      activeTab={activeTab} 
      onTabChange={setActiveTab} 
      tabContents={tabContents}
    />
  );
}