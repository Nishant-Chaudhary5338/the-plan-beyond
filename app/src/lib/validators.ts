import { z } from 'zod';

const emailSchema = z.string().email();

/**
 * Shared email check — backed by Zod's `.email()` so inline form validation and
 * schema validation agree on what's valid (no regex drift between the two).
 */
export function isEmail(value: string): boolean {
  return emailSchema.safeParse(value.trim()).success;
}
