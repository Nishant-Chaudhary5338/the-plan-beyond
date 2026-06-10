import {
  parsePhoneNumberFromString,
  type CountryCode,
  type PhoneNumber,
} from 'libphonenumber-js';
import { DEFAULT_ISO2 } from './countries';

/** A phone number normalised to its canonical parts. */
export interface CanonicalPhone {
  /** Dial code incl. leading "+", e.g. "+44". */
  countryCode: string;
  /** National significant number, digits only (no trunk prefix), e.g. "7700900456". */
  nationalNumber: string;
  /** Full E.164 form, e.g. "+447700900456". */
  e164: string;
}

/**
 * Canonicalise a dial code + national number into a validated E.164 form.
 *
 * This is the single source of truth for turning user/imported input into a
 * stored number. It normalises away trunk prefixes (e.g. a UK "07700900456"
 * entered under +44 becomes "+447700900456") and separators, so the same
 * logical number always produces the same E.164 — which is what dedup compares.
 *
 * Pass `region` (an ISO-3166 alpha-2 like "GB") when known for the most accurate
 * trunk-prefix handling; otherwise we fall back to parsing the combined string.
 *
 * Returns `null` when the input isn't a valid phone number.
 */
export function canonicalizePhone(
  dialCode: string,
  nationalNumber: string,
  region?: CountryCode,
): CanonicalPhone | null {
  const digits = nationalNumber.replace(/[^\d]/g, '');
  if (!digits) return null;

  // Try, in order: a region-aware parse (best trunk-prefix handling), the
  // combined dial code + number as E.164, and finally the same with any leading
  // trunk zeros stripped (E.164 national numbers never start with 0).
  const attempts: Array<PhoneNumber | undefined> = [
    region ? parsePhoneNumberFromString(digits, region) : undefined,
    parsePhoneNumberFromString(`${dialCode}${digits}`),
    parsePhoneNumberFromString(`${dialCode}${digits.replace(/^0+/, '')}`),
  ];

  for (const parsed of attempts) {
    if (parsed?.isPossible()) {
      return {
        countryCode: `+${parsed.countryCallingCode}`,
        nationalNumber: parsed.nationalNumber,
        e164: parsed.number,
      };
    }
  }
  return null;
}

/** Canonical E.164 for a dial code + national number, or `null` if invalid. */
export function toE164(dialCode: string, nationalNumber: string, region?: CountryCode): string | null {
  return canonicalizePhone(dialCode, nationalNumber, region)?.e164 ?? null;
}

/**
 * Canonicalise an already-international number (one that may or may not start
 * with "+"), guessing the region for bare national numbers. Used by the VCF
 * importer, where the source format varies wildly.
 */
export function canonicalizeFreeform(raw: string, defaultRegion: CountryCode = DEFAULT_ISO2 as CountryCode): CanonicalPhone | null {
  const cleaned = raw.replace(/[^\d+]/g, '');
  if (!cleaned) return null;
  const parsed = cleaned.startsWith('+')
    ? parsePhoneNumberFromString(cleaned)
    : parsePhoneNumberFromString(cleaned, defaultRegion);
  if (!parsed?.isPossible()) return null;
  return {
    countryCode: `+${parsed.countryCallingCode}`,
    nationalNumber: parsed.nationalNumber,
    e164: parsed.number,
  };
}

/** Format an E.164 number for display, falling back to the raw string. */
export function formatPhoneDisplay(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}

/** Validate a dial code + national number combination. */
export function isValidPhone(dialCode: string, nationalNumber: string, region?: CountryCode): boolean {
  return canonicalizePhone(dialCode, nationalNumber, region) !== null;
}
