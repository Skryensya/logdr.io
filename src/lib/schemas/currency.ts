/**
 * Currency-related validation schemas
 */

import { z } from 'zod';
import { currencySchema } from './base';

// Currency configuration schema
export const currencyConfigSchema = z.object({
  code: z.string().length(3),
  name: z.string().min(1),
  symbol: z.string().min(1).max(5),
  minorUnit: z.number().int().min(0).max(8),
  defaultLocale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/)
});

// Type exports
export type CurrencyConfigInput = z.infer<typeof currencyConfigSchema>;