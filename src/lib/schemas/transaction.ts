/**
 * Transaction and TransactionLine validation schemas
 */

import { z } from 'zod';
import { 
  timestampSchema, 
  currencySchema, 
  dateSchema, 
  yearMonthSchema,
  transactionIdSchema,
  categoryIdSchema,
  accountIdSchema,
  lineIdSchema,
  deltaTypeSchema
} from './base';

// Transaction schema
export const transactionSchema = z.object({
  _id: transactionIdSchema,
  _rev: z.string().optional(),
  date: dateSchema,
  description: z.string().min(1).max(500),
  categoryId: categoryIdSchema.optional(),
  tags: z.array(z.string().max(50)).optional(),
  yearMonth: yearMonthSchema, // for indexing
  lineCount: z.number().int().positive(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const transactionCreateSchema = transactionSchema.omit({ 
  _id: true, 
  _rev: true, 
  yearMonth: true, 
  lineCount: true, 
  createdAt: true, 
  updatedAt: true 
});

export const transactionUpdateSchema = transactionSchema.partial().omit({ 
  _id: true, 
  _rev: true, 
  createdAt: true 
});

// TransactionLine schema (IMMUTABLE)
export const transactionLineSchema = z.object({
  _id: lineIdSchema,
  // NO _rev - immutable
  transactionId: transactionIdSchema,
  accountId: accountIdSchema,
  amount: z.number().int(), // integer in minor unit
  currency: currencySchema,
  date: dateSchema, // duplicated for queries
  yearMonth: yearMonthSchema, // duplicated for indexing
  categoryId: categoryIdSchema.optional(),
  isDebit: z.boolean(), // derived from amount sign
  createdAt: timestampSchema, // never changes
  
  // Delta/correction fields
  deltaType: deltaTypeSchema.optional(),
  originalLineId: lineIdSchema.optional(),
  reason: z.string().max(500).optional()
});

export const transactionLineCreateSchema = transactionLineSchema.omit({
  _id: true,
  transactionId: true,
  date: true,
  yearMonth: true,
  isDebit: true,
  createdAt: true
});

// Transaction creation with lines validation
export const createTransactionWithLinesSchema = z.object({
  transaction: transactionCreateSchema,
  lines: z.array(transactionLineCreateSchema).min(2) // At least 2 lines for double-entry
}).refine(
  (data) => {
    // Validate that lines balance to zero
    const total = data.lines.reduce((sum, line) => sum + line.amount, 0);
    return total === 0;
  },
  {
    message: "Transaction lines must balance to zero (double-entry accounting)",
    path: ["lines"]
  }
);

// Validation functions
export function validateTransaction(data: unknown) {
  return transactionSchema.parse(data);
}

export function validateTransactionLine(data: unknown) {
  return transactionLineSchema.parse(data);
}

export function validateCreateTransactionWithLines(data: unknown) {
  return createTransactionWithLinesSchema.parse(data);
}

// Type exports
export type TransactionInput = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdate = z.infer<typeof transactionUpdateSchema>;
export type TransactionLineInput = z.infer<typeof transactionLineCreateSchema>;
export type CreateTransactionWithLinesInput = z.infer<typeof createTransactionWithLinesSchema>;