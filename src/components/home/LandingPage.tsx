"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, CreditCard, FolderTree, LayoutDashboard, Shield, Smartphone } from 'lucide-react';
import { signIn } from 'next-auth/react';

interface LandingPageProps {
  onTryIt: () => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export function LandingPage({ onTryIt, isLoading, error }: LandingPageProps) {
  const features = [
    {
      icon: <LayoutDashboard className="h-6 w-6" />,
      title: "Dashboard Overview",
      description: "See all your financial data at a glance with beautiful charts and insights"
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: "Account Management",
      description: "Track multiple accounts, balances, and transaction history in one place"
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Transaction Tracking",
      description: "Categorize and analyze your spending patterns with detailed reports"
    },
    {
      icon: <FolderTree className="h-6 w-6" />,
      title: "Smart Categories",
      description: "Organize your expenses with customizable categories and tags"
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "Works Offline",
      description: "Use the app anywhere, even without internet connection"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Privacy First",
      description: "Your financial data stays secure and private on your device"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Take Control of Your
              <span className="text-primary block">Finances</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A simple, powerful personal finance manager that works entirely in your browser. 
              No signup required to get started.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 max-w-md mx-auto">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Primary CTA */}
          <div className="space-y-4">
            <Button
              onClick={onTryIt}
              size="lg"
              className="text-lg px-8 py-6 h-auto"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                <>
                  <LayoutDashboard className="mr-2 h-5 w-5" />
                  Try It Now
                </>
              )}
            </Button>
            
            <p className="text-sm text-muted-foreground">
              No signup required • Start using immediately • Data stays on your device
            </p>
          </div>

          {/* Secondary Login Option */}
          <div className="pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signIn('google')}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground"
            >
              Already have an account? Sign in with Google
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Everything you need to manage money</h2>
            <p className="text-muted-foreground">
              Powerful features that work offline and keep your data private
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 p-2 bg-primary/10 rounded-md text-primary">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold">{feature.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center space-y-4 pt-8 border-t">
          <h3 className="text-2xl font-semibold">Ready to get started?</h3>
          <Button
            onClick={onTryIt}
            size="lg"
            variant="outline"
            disabled={isLoading}
            className="text-lg px-8 py-6 h-auto"
          >
            {isLoading ? 'Starting...' : 'Try Logdrio Now'}
          </Button>
          <p className="text-xs text-muted-foreground">
            By using Logdrio, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}