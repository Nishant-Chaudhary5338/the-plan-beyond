import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { CreateContactInput } from '../model/types';
import { DEFAULT_DIAL_CODE } from '@/lib/countries';

export interface ParsedContact extends CreateContactInput {
  /** Display label for the review list. */
  label: string;
}

function splitName(fn: string, n: string): { firstName: string; lastName: string } {
  // vCard N is "Family;Given;Middle;Prefix;Suffix".
  if (n) {
    const [family = '', given = ''] = n.split(';');
    if (given || family) return { firstName: given.trim() || family.trim(), lastName: given ? family.trim() : '' };
  }
  const parts = fn.trim().split(/\s+/);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

function parsePhone(tel: string): { countryCode: string; phone: string } | null {
  const cleaned = tel.replace(/[^\d+]/g, '');
  const parsed = parsePhoneNumberFromString(cleaned.startsWith('+') ? cleaned : `+${cleaned}`);
  if (parsed) return { countryCode: `+${parsed.countryCallingCode}`, phone: parsed.nationalNumber };
  const digits = cleaned.replace(/\D/g, '');
  return digits ? { countryCode: DEFAULT_DIAL_CODE, phone: digits } : null;
}

function readField(card: string, field: string): string {
  // Matches e.g. "TEL;TYPE=CELL:+91..." → captures the value after the first colon.
  const re = new RegExp(`^${field}[^:\\r\\n]*:(.+)$`, 'im');
  return re.exec(card)?.[1]?.trim() ?? '';
}

/** Parse a .vcf string into importable contacts, skipping cards without a usable phone. */
export function parseVcf(text: string): ParsedContact[] {
  const cards = text.split(/BEGIN:VCARD/i).filter((c) => /END:VCARD/i.test(c));
  const result: ParsedContact[] = [];
  for (const card of cards) {
    const fn = readField(card, 'FN');
    const n = readField(card, 'N');
    const tel = readField(card, 'TEL');
    const phone = parsePhone(tel);
    if (!phone) continue;
    const { firstName, lastName } = splitName(fn, n);
    if (!firstName) continue;
    result.push({
      firstName,
      lastName,
      countryCode: phone.countryCode,
      phone: phone.phone,
      label: [firstName, lastName].filter(Boolean).join(' '),
    });
  }
  return result;
}
