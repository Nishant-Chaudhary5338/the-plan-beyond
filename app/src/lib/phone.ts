import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';

/** Format an E.164 number for display, falling back to the raw string. */
export function formatPhoneDisplay(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}

/** Validate a dial code + national number combination. */
export function isValidPhone(dialCode: string, nationalNumber: string): boolean {
  if (!nationalNumber.trim()) return false;
  return isValidPhoneNumber(`${dialCode}${nationalNumber}`);
}
