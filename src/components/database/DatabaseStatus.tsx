"use client";

import { Badge } from "@/components/ui/badge";
import { Database, DatabaseZap, AlertCircle, Loader2 } from "lucide-react";
import { useDatabase } from "@/contexts/DatabaseContext";

export function DatabaseStatus() {
  const { isInitialized, isInitializing, error } = useDatabase();

  if (error) {
    return (
      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" title="Error DB" />
    );
  }

  if (isInitializing) {
    return (
      <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" title="Inicializando DB..." />
    );
  }

  if (isInitialized) {
    return (
      <div className="w-3 h-3 rounded-full bg-green-500" title="DB Conectada" />
    );
  }

  return (
    <div className="w-3 h-3 rounded-full bg-gray-500" title="DB Desconectada" />
  );
}