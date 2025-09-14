/**
 * Account-related validation schemas
 */

import { z } from 'zod';
import { timestampSchema, currencySchema, accountTypeSchema, accountIdSchema } from './base';

// Account schema
export const accountSchema = z.object({
  _id: accountIdSchema,
  _rev: z.string().optional(),
  name: z.string().min(1).max(100),
  type: accountTypeSchema,
  visible: z.boolean(),
  archived: z.boolean(),
  defaultCurrency: currencySchema,
  minorUnit: z.number().int().min(0).max(8), // CLP=0, USD=2, BTC=8
  balance: z.number().int(), // cached calculated value
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const accountCreateSchema = accountSchema.omit({ 
  _id: true, 
  _rev: true, 
  createdAt: true, 
  updatedAt: true 
});

export const accountUpdateSchema = accountSchema.partial().omit({ 
  _id: true, 
  _rev: true, 
  createdAt: true 
});

// Validation function
export function validateAccount(data: unknown) {
  return accountSchema.parse(data);
}

// Type exports
export type AccountInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdate = z.infer<typeof accountUpdateSchema>;