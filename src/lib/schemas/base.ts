/**
 * Base validation schemas and common patterns
 */

import { z } from 'zod';
import { isValidCurrency } from '../currency';

// Currency validation
export const currencySchema = z.string().refine(isValidCurrency, {
  message: "Invalid currency code"
});

// Base schemas for common patterns
export const timestampSchema = z.string().datetime();
export const emailSchema = z.string().email();

// Date patterns
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');
export const yearMonthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Invalid year-month format (YYYY-MM)');

// ID patterns
export const accountIdSchema = z.string().startsWith("account::");
export const categoryIdSchema = z.string().startsWith("category::");
export const transactionIdSchema = z.string().startsWith("txn::");
export const lineIdSchema = z.string().startsWith("line::");

// Color validation
export const hexColorSchema = z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color');

// Utility schemas
export const paginationSchema = z.object({
  limit: z.number().int().positive().max(1000).default(50),
  offset: z.number().int().nonnegative().default(0),
  sort: z.enum(['asc', 'desc']).default('desc')
});

export const dateRangeSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema
}).refine(
  (data) => data.startDate <= data.endDate,
  {
    message: "Start date must be before or equal to end date"
  }
);

// Common enums
export const accountTypeSchema = z.enum(["asset", "liability", "income", "expense", "equity"]);
export const categoryKindSchema = z.enum(["income", "expense", "transfer"]);
export const gateMethodSchema = z.enum(["pin", "webauthn", "none"]);
export const deltaTypeSchema = z.enum(["correction", "reversal"]);
export const sortOrderSchema = z.enum(['asc', 'desc']);
export const accountViewSchema = z.enum(["all", "active"]);
export const cashflowKindSchema = z.enum(['in', 'out']);

// Type exports
export type CurrencyCode = z.infer<typeof currencySchema>;
export type DateString = z.infer<typeof dateSchema>;
export type YearMonthString = z.infer<typeof yearMonthSchema>;
export type AccountId = z.infer<typeof accountIdSchema>;
export type CategoryId = z.infer<typeof categoryIdSchema>;
export type TransactionId = z.infer<typeof transactionIdSchema>;
export type LineId = z.infer<typeof lineIdSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;