import { describe, it, expect } from 'vitest';
import {
  canonicalizePhone,
  canonicalizeFreeform,
  toE164,
  isValidPhone,
  formatPhoneDisplay,
} from './phone';

describe('canonicalizePhone', () => {
  it('canonicalises a valid international number into its parts', () => {
    expect(canonicalizePhone('+91', '9867239020')).toEqual({
      countryCode: '+91',
      nationalNumber: '9867239020',
      e164: '+919867239020',
    });
  });

  it('strips a national trunk prefix (leading zero) when a region is given', () => {
    const c = canonicalizePhone('+44', '07700900456', 'GB');
    expect(c?.e164).toBe('+447700900456');
    expect(c?.nationalNumber).toBe('7700900456');
  });

  it('strips a trunk zero even without a region (combined-string fallback)', () => {
    expect(canonicalizePhone('+44', '07700900456')?.e164).toBe('+447700900456');
  });

  it('is the dedup invariant: same number with/without trunk zero → identical E.164', () => {
    const withZero = canonicalizePhone('+44', '07700900456', 'GB')?.e164;
    const without = canonicalizePhone('+44', '7700900456', 'GB')?.e164;
    expect(withZero).toBe(without);
    expect(withZero).toBe('+447700900456');
  });

  it('normalises separators and spacing to the same E.164', () => {
    const a = canonicalizePhone('+1', '(202) 555-0123');
    const b = canonicalizePhone('+1', '2025550123');
    expect(a?.e164).toBe('+12025550123');
    expect(a?.e164).toBe(b?.e164);
  });

  it('returns null for empty or junk input', () => {
    expect(canonicalizePhone('+44', '')).toBeNull();
    expect(canonicalizePhone('+44', '   ')).toBeNull();
    expect(canonicalizePhone('+1', 'abc')).toBeNull();
    expect(canonicalizePhone('+1', '12')).toBeNull(); // too short to be possible
  });
});

describe('toE164', () => {
  it('returns the canonical E.164 string or null', () => {
    expect(toE164('+91', '9867239020')).toBe('+919867239020');
    expect(toE164('+1', 'nope')).toBeNull();
  });
});

describe('canonicalizeFreeform', () => {
  it('parses an already-international number', () => {
    expect(canonicalizeFreeform('+44 7700 900456')?.e164).toBe('+447700900456');
  });

  it('parses a bare national number against the supplied default region', () => {
    expect(canonicalizeFreeform('(202) 555-0123', 'US')?.e164).toBe('+12025550123');
  });

  it('rejects unparseable input', () => {
    expect(canonicalizeFreeform('')).toBeNull();
    expect(canonicalizeFreeform('not-a-number')).toBeNull();
  });
});

describe('isValidPhone', () => {
  it('accepts a valid combination and rejects an invalid one', () => {
    expect(isValidPhone('+91', '9867239020')).toBe(true);
    expect(isValidPhone('+1', '2025550123')).toBe(true);
    expect(isValidPhone('+44', '')).toBe(false);
    expect(isValidPhone('+1', '12')).toBe(false);
  });
});

describe('formatPhoneDisplay', () => {
  it('formats a valid E.164 for display', () => {
    expect(formatPhoneDisplay('+919867239020')).toBe('+91 98672 39020');
  });

  it('falls back to the raw string for an unparseable value', () => {
    expect(formatPhoneDisplay('garbage')).toBe('garbage');
  });
});
