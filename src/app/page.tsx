"use client";

import { useIsAppOffline } from "@/hooks/useIsAppOffline";
import AuthStatus from "@/components/auth/AuthStatus";
import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const isOffline = useIsAppOffline();

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Badge 
              variant={isOffline ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-500' : 'bg-green-500'}`} />
              {isOffline ? 'App is offline' : 'App is online'}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Bienvenido a Logdrio
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tu plataforma personal para gestionar, analizar y monitorear logs de manera eficiente
            </p>
          </div>
        </div>

        {/* Auth Status Card */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <AuthStatus />
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
