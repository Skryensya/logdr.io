"use client";

import { SessionProvider } from "next-auth/react";
import { AuthContextProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <AuthContextProvider>
          {children}
        </AuthContextProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}