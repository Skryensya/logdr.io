"use client";

import { useEffect, useState } from "react";
import { Settings, Monitor, Moon, Sun, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { useThemeEffects } from "@/hooks/useThemeEffects";
import { useViewTransition } from "@/hooks/useViewTransition";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  getUserPreferences, 
  updateUserPreferences,
  type UserPreferences 
} from "@/lib/logdrioDB";

export default function PreferencesMenu() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { data: session } = useSession();
  const { isDarkMode, isLightMode, mounted, themeStatus } = useThemeEffects();
  const { startViewTransition } = useViewTransition();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [, forceUpdate] = useState({});

  // Load user preferences (excluding theme)
  useEffect(() => {
    async function loadPreferences() {
      if (session?.user?.email) {
        try {
          const userPrefs = await getUserPreferences(session.user.email);
          setPreferences(userPrefs);
          
          // Theme is now handled by next-themes + localStorage, not by our DB
          // Don't sync theme from database anymore
        } catch (error) {
          console.error('Error loading user preferences:', error);
        }
      }
    }

    if (mounted && session?.user?.email) {
      loadPreferences();
    }
  }, [session?.user?.email, mounted]);

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'auto') => {
    // Use View Transition API to animate the theme change
    startViewTransition(() => {
      setTheme(newTheme);
    });
    
    // Close menu after selection
    setIsOpen(false);
  };

  // Listen to system theme changes and force update
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = () => {
      // Force re-render by updating a dummy state
      forceUpdate({});
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [mounted]);

  // Force update when theme-related values change
  useEffect(() => {
    if (mounted) {
      forceUpdate({});
    }
  }, [mounted, resolvedTheme, isDarkMode, isLightMode]);

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Settings className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          {isDarkMode ? (
            <Moon className="h-4 w-4 text-blue-500" />
          ) : (
            <Sun className="h-4 w-4 text-yellow-500" />
          )}
          <span className="sr-only">Abrir preferencias</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Preferencias</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Theme Status */}
        <DropdownMenuItem disabled>
          <div className="flex items-center gap-2">
            {isDarkMode ? (
              <Moon className="h-4 w-4 text-blue-500" />
            ) : (
              <Sun className="h-4 w-4 text-yellow-500" />
            )}
            <span className="text-sm font-medium">{themeStatus.text}</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Cambiar tema
        </DropdownMenuLabel>
        
        <DropdownMenuItem onClick={() => handleThemeChange('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Claro</span>
          {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Oscuro</span>
          {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleThemeChange('auto')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>Sistema</span>
          {(theme === 'system' || theme === 'auto') && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Estado del tema
        </DropdownMenuLabel>
        <DropdownMenuItem disabled>
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tema configurado:</span>
              <span className="text-xs font-medium">
                {theme === 'light' ? 'Claro' : theme === 'dark' ? 'Oscuro' : 'Sistema'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tema activo:</span>
              <span className="text-xs font-medium">
                {themeStatus.resolvedTheme === 'dark' ? 'Oscuro' : 'Claro'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Guardado en:</span>
              <span className="text-xs font-medium text-green-600">localStorage</span>
            </div>
          </div>
        </DropdownMenuItem>

        {preferences && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Otras preferencias
            </DropdownMenuLabel>
            <DropdownMenuItem disabled>
              <span className="text-xs text-muted-foreground">
                Idioma: {preferences.language === 'es' ? 'Español' : 'English'}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <span className="text-xs text-muted-foreground">
                Zona horaria: {preferences.timezone.split('/').pop()}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <span className="text-xs text-muted-foreground text-blue-600">
                Guardadas en: PouchDB
              </span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}