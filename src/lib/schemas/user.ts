/**
 * User-related validation schemas
 */

import { z } from 'zod';
import { timestampSchema, emailSchema, currencySchema } from './base';

// User schema
export const userSchema = z.object({
  _id: z.literal("user"),
  _rev: z.string().optional(),
  userId: z.string().min(1),
  email: emailSchema,
  displayName: z.string().min(1),
  homeCurrency: z.enum(["CLP", "USD", "EUR", "BTC"]),
  locale: z.enum(["es-CL", "en-US"]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const userCreateSchema = userSchema.omit({ _rev: true });
export const userUpdateSchema = userSchema.partial().omit({ _id: true, userId: true, createdAt: true });

// User Settings schema
export const userSettingsSchema = z.object({
  _id: z.literal("settings"),
  _rev: z.string().optional(),
  
  // Security configuration
  requireGatePerSession: z.boolean(),
  gateMethod: z.enum(["pin", "webauthn", "none"]),
  gateDurationMin: z.number().int().positive().max(60), // max 1 hour
  
  // Financial configuration
  homeCurrency: currencySchema,
  decimalPlaces: z.number().int().min(0).max(8),
  dateFormat: z.string().max(20),
  firstDayOfWeek: z.union([z.literal(0), z.literal(1)]), // 0=Sunday, 1=Monday
  
  // UI/UX
  defaultAccountView: z.enum(["all", "active"]),
  showBalance: z.boolean(),
  compactMode: z.boolean(),
  
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const userSettingsCreateSchema = userSettingsSchema.omit({ _rev: true });
export const userSettingsUpdateSchema = userSettingsSchema.partial().omit({ _id: true, createdAt: true });

// Validation functions
export function validateUser(data: unknown) {
  return userSchema.parse(data);
}

export function validateUserSettings(data: unknown) {
  return userSettingsSchema.parse(data);
}

// Type exports
export type UserInput = z.infer<typeof userCreateSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type UserSettingsInput = z.infer<typeof userSettingsCreateSchema>;
export type UserSettingsUpdate = z.infer<typeof userSettingsUpdateSchema>;