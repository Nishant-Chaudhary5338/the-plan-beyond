import { z } from 'zod';

const errorBody = z.object({ message: z.string() });

/** Extract a human-readable message from an RTK Query / fetch error. */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const parsed = errorBody.safeParse((error as { data: unknown }).data);
    if (parsed.success) return parsed.data.message;
  }
  return fallback;
}
