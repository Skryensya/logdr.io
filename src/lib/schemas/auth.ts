/**
 * Authentication-related validation schemas
 */

import { z } from 'zod';
import { AuthState } from '@/types/database';
import { emailSchema } from './base';

// Auth state schema
export const authStateSchema = z.nativeEnum(AuthState);

// Auth status schema
export const authStatusSchema = z.object({
  state: authStateSchema,
  userId: z.string().optional(),
  email: emailSchema.optional(),
  jwtExpiresAt: z.number().optional(),
  gateExpiresAt: z.number().optional(), // timestamp sessionStorage
  requiresGate: z.boolean()
});

// JWT payload schema
export const jwtPayloadSchema = z.object({
  iss: z.string(),
  aud: z.string(),
  sub: z.string(), // userId
  email: emailSchema,
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
  scope: z.array(z.string()).optional()
});

// Type exports
export type AuthStatusInput = z.infer<typeof authStatusSchema>;
export type JWTPayloadInput = z.infer<typeof jwtPayloadSchema>;