import { describe, it, expect } from 'vitest';
import { parseVcf } from './vcfParser';

const VCF = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
N:Doe;John;;;
TEL;TYPE=CELL:+919876512345
EMAIL:john@example.com
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Sara Khan
TEL:+447700900456
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:No Phone Person
END:VCARD`;

describe('parseVcf', () => {
  it('parses cards with a usable phone', () => {
    const result = parseVcf(VCF);
    expect(result).toHaveLength(2);
  });

  it('extracts name parts from the N field', () => {
    const [john] = parseVcf(VCF);
    expect(john?.firstName).toBe('John');
    expect(john?.lastName).toBe('Doe');
  });

  it('derives country code from the international number', () => {
    const [john, sara] = parseVcf(VCF);
    expect(john?.countryCode).toBe('+91');
    expect(john?.phone).toBe('9876512345');
    expect(sara?.countryCode).toBe('+44');
  });

  it('skips cards without a phone number', () => {
    expect(parseVcf(VCF).some((c) => c.firstName === 'No')).toBe(false);
  });

  it('returns nothing for empty input', () => {
    expect(parseVcf('')).toEqual([]);
  });
});
