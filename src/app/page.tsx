"use client";

import { useIsAppOffline } from "@/hooks/useIsAppOffline";
import AuthStatus from "@/components/auth/AuthStatus";
import SessionTimer from "@/components/auth/SessionTimer";
import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
            <div className="space-y-4">
              <SessionTimer />
              <AuthStatus />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Acciones rápidas</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">📊</div>
                  <div>
                    <CardTitle className="text-xl">Dashboard</CardTitle>
                    <CardDescription className="mt-1">
                      Ver resumen de tus logs y métricas en tiempo real
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            <Card className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">📝</div>
                  <div>
                    <CardTitle className="text-xl">Logs</CardTitle>
                    <CardDescription className="mt-1">
                      Gestionar, buscar y analizar todos tus logs
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            <Card className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">⚙️</div>
                  <div>
                    <CardTitle className="text-xl">Configuración</CardTitle>
                    <CardDescription className="mt-1">
                      Personalizar preferencias y ajustes de la aplicación
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            <Card className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">📈</div>
                  <div>
                    <CardTitle className="text-xl">Análisis</CardTitle>
                    <CardDescription className="mt-1">
                      Reportes avanzados y insights de tus datos
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
