import { z } from 'zod';

const errorBody = z.object({ message: z.string() });

/**
 * Extract a human-readable message from an RTK Query / fetch error.
 *
 * Handles the three shapes RTK Query produces: a server error body
 * (`{ data: { message } }`), transport/parse failures (`FETCH_ERROR` /
 * `PARSING_ERROR` / `TIMEOUT_ERROR`, which carry an `error` string — this is
 * what a failed Zod `transformResponse` surfaces as), and serialized errors
 * (`{ message }`).
 */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error && typeof error === 'object') {
    if ('data' in error) {
      const parsed = errorBody.safeParse((error as { data: unknown }).data);
      if (parsed.success) return parsed.data.message;
    }
    // FETCH_ERROR / PARSING_ERROR / TIMEOUT_ERROR / CUSTOM_ERROR
    const errStr = (error as { error?: unknown }).error;
    if (typeof errStr === 'string' && errStr.trim()) return errStr;
    // SerializedError
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return fallback;
}
