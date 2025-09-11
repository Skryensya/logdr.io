"use client";

import { SessionProvider } from "next-auth/react";
import { AuthContextProvider } from "@/contexts/AuthContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextProvider>
        {children}
      </AuthContextProvider>
    </SessionProvider>
  );
}