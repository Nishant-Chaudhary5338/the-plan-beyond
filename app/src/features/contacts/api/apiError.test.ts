import { describe, it, expect } from 'vitest';
import { getApiErrorMessage } from './apiError';

describe('getApiErrorMessage', () => {
  it('reads a server error body { data: { message } }', () => {
    expect(getApiErrorMessage({ status: 409, data: { message: 'Already exists' } })).toBe('Already exists');
  });

  it('surfaces transport/parse failures via the `error` field', () => {
    // This is what a failed Zod transformResponse / network error looks like.
    expect(getApiErrorMessage({ status: 'PARSING_ERROR', error: 'Invalid response shape' })).toBe(
      'Invalid response shape'
    );
    expect(getApiErrorMessage({ status: 'FETCH_ERROR', error: 'Failed to fetch' })).toBe('Failed to fetch');
  });

  it('reads a SerializedError message', () => {
    expect(getApiErrorMessage({ name: 'Error', message: 'Boom' })).toBe('Boom');
  });

  it('falls back when nothing usable is present', () => {
    expect(getApiErrorMessage({ status: 500, data: {} })).toBe('Something went wrong');
    expect(getApiErrorMessage(undefined, 'Custom fallback')).toBe('Custom fallback');
  });
});
