/**
 * Category-related validation schemas
 */

import { z } from 'zod';
import { timestampSchema, categoryKindSchema, categoryIdSchema, hexColorSchema } from './base';

// Category schema
export const categorySchema = z.object({
  _id: categoryIdSchema,
  _rev: z.string().optional(),
  name: z.string().min(1).max(100),
  kind: categoryKindSchema,
  parentCategoryId: categoryIdSchema.optional(),
  color: hexColorSchema.optional(),
  icon: z.string().max(50).optional(), // Icon name or emoji
  archived: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const categoryCreateSchema = categorySchema.omit({ 
  _id: true, 
  _rev: true, 
  createdAt: true, 
  updatedAt: true 
});

export const categoryUpdateSchema = categorySchema.partial().omit({ 
  _id: true, 
  _rev: true, 
  createdAt: true 
});

// Validation function
export function validateCategory(data: unknown) {
  return categorySchema.parse(data);
}

// Type exports
export type CategoryInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;