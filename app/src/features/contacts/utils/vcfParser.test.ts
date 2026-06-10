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

  it('unfolds RFC 6350 folded lines before parsing the value', () => {
    const folded = `BEGIN:VCARD
VERSION:3.0
FN:Folded Number
TEL:+12025
 550123
END:VCARD`;
    const [c] = parseVcf(folded);
    expect(c?.countryCode).toBe('+1');
    // The continuation digits must not be dropped.
    expect(c?.phone).toBe('2025550123');
  });

  it('respects escaped semicolons in the N field', () => {
    const escaped = `BEGIN:VCARD
VERSION:3.0
N:van der Berg\\;Jr;Bob;;;
TEL:+14155550100
END:VCARD`;
    const [c] = parseVcf(escaped);
    expect(c?.firstName).toBe('Bob');
    expect(c?.lastName).toBe('van der Berg;Jr');
  });

  it('falls back to the family name when N has no given name', () => {
    const familyOnly = `BEGIN:VCARD
VERSION:3.0
N:Smith;;;;
TEL:+14155550111
END:VCARD`;
    const [c] = parseVcf(familyOnly);
    expect(c?.firstName).toBe('Smith');
    expect(c?.lastName).toBe('');
  });

  it('parses a US national number against the default region instead of mangling it', () => {
    // A bare US number must not be misread as another country by prepending "+".
    const usLocal = `BEGIN:VCARD
VERSION:3.0
FN:US Local
TEL:+1 (202) 555-0123
END:VCARD`;
    const [c] = parseVcf(usLocal);
    expect(c?.countryCode).toBe('+1');
    expect(c?.phone).toBe('2025550123');
  });

  it('prefers a parseable CELL number when an earlier TEL is unusable', () => {
    const multiTel = `BEGIN:VCARD
VERSION:3.0
FN:Multi Tel
TEL;TYPE=HOME:not-a-number
TEL;TYPE=CELL:+447700900456
END:VCARD`;
    const [c] = parseVcf(multiTel);
    expect(c?.countryCode).toBe('+44');
    expect(c?.phone).toBe('7700900456');
  });

  it('normalises a national leading-zero number to canonical E.164 parts', () => {
    const leadingZero = `BEGIN:VCARD
VERSION:3.0
FN:UK Trunk
TEL:+44 07700 900456
END:VCARD`;
    const [c] = parseVcf(leadingZero);
    expect(c?.countryCode).toBe('+44');
    expect(c?.phone).toBe('7700900456');
  });

  it('decodes quoted-printable name values', () => {
    const qp = `BEGIN:VCARD
VERSION:2.1
N;ENCODING=QUOTED-PRINTABLE;CHARSET=UTF-8:Mu=C3=B1oz;Jos=C3=A9;;;
TEL:+34911223344
END:VCARD`;
    const [c] = parseVcf(qp);
    expect(c?.firstName).toBe('José');
    expect(c?.lastName).toBe('Muñoz');
  });

  it('handles item-grouped property names', () => {
    const grouped = `BEGIN:VCARD
VERSION:3.0
FN:Grouped Person
item1.TEL:+14155550133
END:VCARD`;
    const [c] = parseVcf(grouped);
    expect(c?.countryCode).toBe('+1');
  });
});
