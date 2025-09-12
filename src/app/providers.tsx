"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider as AuthContextProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      storageKey="theme"
      themes={['light', 'dark', 'system']}
      forcedTheme={undefined}
    >
      <SessionProvider>
        <AuthContextProvider>
          {children}
        </AuthContextProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}