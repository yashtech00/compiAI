import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  displayName: z.string().trim().min(2, 'Name must be at least 2 characters').max(50)
});

export const signinSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(50).optional(),
  experienceLevel: z.enum(['BEGINNER', 'STUDENT', 'JUNIOR', 'INTERMEDIATE', 'ADVANCED']).optional(),
  dailyMinutes: z.number().int().min(5).max(120).optional(),
  timezone: z.string().optional(),
  avatarUrl: z.string().url().nullable().optional()
});
