"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PreferencesMenu() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    // Use View Transition API to animate the theme change
    if ('startViewTransition' in document) {
      (document as Document & { startViewTransition?: (callback: () => void) => void }).startViewTransition?.(() => {
        setTheme(newTheme);
      });
    } else {
      setTheme(newTheme);
    }
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          {resolvedTheme === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-40">
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
        
        <DropdownMenuItem onClick={() => handleThemeChange('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>Sistema</span>
          {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}