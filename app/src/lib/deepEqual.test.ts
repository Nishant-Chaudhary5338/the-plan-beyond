import { describe, it, expect } from 'vitest';
import { deepEqual } from './deepEqual';

describe('deepEqual', () => {
  it('compares primitives', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual('a', 'b')).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(NaN, NaN)).toBe(true);
  });

  it('is insensitive to key order', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it('treats a missing key and an undefined value as equal', () => {
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });

  it('compares nested objects and arrays deeply', () => {
    const a = { phones: [{ id: '1', e164: '+91' }], address: { city: 'X' } };
    const b = { phones: [{ id: '1', e164: '+91' }], address: { city: 'X' } };
    expect(deepEqual(a, b)).toBe(true);
    expect(deepEqual(a, { ...b, address: { city: 'Y' } })).toBe(false);
  });

  it('distinguishes arrays from objects and different lengths', () => {
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual({ 0: 'a', 1: 'b' }, ['a', 'b'])).toBe(false);
  });
});
