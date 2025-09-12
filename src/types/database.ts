export interface User {
  _id: "user";
  _rev?: string;
  userId: string;
  email: string;
  displayName: string;
  homeCurrency: "CLP" | "USD" | "EUR" | "BTC";
  locale: "es-CL" | "en-US";
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface Account {
  _id: `account::${string}`;
  _rev?: string;
  name: string;
  type: "asset" | "liability" | "income" | "expense" | "equity";
  visible: boolean;
  archived: boolean;
  defaultCurrency: string;
  minorUnit: number; // CLP=0, USD=2, BTC=8
  balance: number; // cache calculado
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: `category::${string}`;
  _rev?: string;
  name: string;
  kind: "income" | "expense" | "transfer";
  parentCategoryId?: string;
  color?: string;
  icon?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  _id: `txn::${string}`;
  _rev?: string;
  date: string; // YYYY-MM-DD
  description: string;
  categoryId?: string;
  tags?: string[];
  yearMonth: string; // YYYY-MM para índices
  lineCount: number; // cache
  createdAt: string;
  updatedAt: string;
}

export interface TransactionLine {
  _id: `line::${string}`;
  // NO _rev - inmutable
  transactionId: string;
  accountId: string;
  amount: number; // entero en unidad mínima
  currency: string;
  date: string; // YYYY-MM-DD duplicado
  yearMonth: string; // YYYY-MM duplicado
  categoryId?: string;
  isDebit: boolean; // derivado del signo
  createdAt: string; // nunca cambia
  
  // Campos para deltas
  deltaType?: "correction" | "reversal";
  originalLineId?: string;
  reason?: string;
}

export interface UserSettings {
  _id: "settings";
  _rev?: string;
  
  // Configuración de seguridad
  requireGatePerSession: boolean;
  gateMethod: "pin" | "webauthn" | "none";
  gateDurationMin: number; // default 5
  
  // Configuración financiera
  homeCurrency: string;
  decimalPlaces: number;
  dateFormat: string;
  firstDayOfWeek: 0 | 1; // 0=domingo, 1=lunes
  
  // UI/UX
  defaultAccountView: "all" | "active";
  showBalance: boolean;
  compactMode: boolean;
  
  createdAt: string;
  updatedAt: string;
}

// Tipos para autenticación
export enum AuthState {
  ANON = "anon",           // Sin autenticar
  JWT_OK = "jwt_ok",       // JWT válido, sin gate
  JWT_STALE = "jwt_stale", // JWT expirado, necesita renovar
  GATED = "gated",         // Necesita PIN/WebAuthn
  UNLOCKED = "unlocked",   // Completamente autenticado
  ERROR = "error"          // Error de autenticación
}

export interface AuthStatus {
  state: AuthState;
  userId?: string;
  email?: string;
  jwtExpiresAt?: number;
  gateExpiresAt?: number; // timestamp sessionStorage
  requiresGate: boolean;
}

export interface JWTPayload {
  iss: string;
  aud: string;
  sub: string; // userId
  email: string;
  exp: number;
  iat: number;
  scope?: string[];
}

// Tipos para configuración de monedas
export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  minorUnit: number; // posiciones decimales
  defaultLocale: string;
}

// Tipos para resultados de vistas
export interface MonthlyBalance {
  yearMonth: string;
  accountId: string;
  currency: string;
  balance: number;
}

export interface MonthlyByCategory {
  yearMonth: string;
  categoryId: string;
  currency: string;
  amount: number;
}

export interface MonthlyCashflow {
  yearMonth: string;
  currency: string;
  kind: 'in' | 'out';
  amount: number;
}

// Tipos para índices PouchDB
export interface PouchDBIndex {
  index: {
    fields: string[];
  };
  name: string;
  ddoc: string;
}

// Tipos para operaciones de base de datos
export type DatabaseDocument = 
  | User 
  | Account 
  | Category 
  | Transaction 
  | TransactionLine 
  | UserSettings;

// Utility types
export type DocumentId<T extends DatabaseDocument> = T['_id'];
export type WithoutRevision<T extends DatabaseDocument> = Omit<T, '_rev'>;
export type CreateDocument<T extends DatabaseDocument> = WithoutRevision<T>;