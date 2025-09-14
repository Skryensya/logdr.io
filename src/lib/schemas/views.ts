/**
 * Database view result validation schemas
 */

import { z } from 'zod';
import { yearMonthSchema, currencySchema, accountIdSchema, categoryIdSchema, cashflowKindSchema } from './base';

// Monthly balance view result schema
export const monthlyBalanceSchema = z.object({
  yearMonth: yearMonthSchema,
  accountId: accountIdSchema,
  currency: currencySchema,
  balance: z.number().int()
});

// Monthly by category view result schema
export const monthlyByCategorySchema = z.object({
  yearMonth: yearMonthSchema,
  categoryId: categoryIdSchema,
  currency: currencySchema,
  amount: z.number().int()
});

// Monthly cashflow view result schema
export const monthlyCashflowSchema = z.object({
  yearMonth: yearMonthSchema,
  currency: currencySchema,
  kind: cashflowKindSchema,
  amount: z.number().int()
});

// Type exports
export type MonthlyBalanceResult = z.infer<typeof monthlyBalanceSchema>;
export type MonthlyByCategoryResult = z.infer<typeof monthlyByCategorySchema>;
export type MonthlyCashflowResult = z.infer<typeof monthlyCashflowSchema>;