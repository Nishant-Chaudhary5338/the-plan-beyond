import type { ParsedContact } from '../utils/vcfParser';

/** Stand-in for contacts returned by Google People API after OAuth (mocked). */
export const GOOGLE_MOCK_CONTACTS: ParsedContact[] = [
  { firstName: 'Rohan', lastName: 'Mehta', countryCode: '+91', phone: '9811122233', label: 'Rohan Mehta' },
  { firstName: 'Sophie', lastName: 'Turner', countryCode: '+44', phone: '7700900456', label: 'Sophie Turner' },
  { firstName: 'Aarav', lastName: 'Singh', countryCode: '+91', phone: '9822233344', label: 'Aarav Singh' },
  { firstName: 'Mia', lastName: 'Chen', countryCode: '+65', phone: '82223344', label: 'Mia Chen' },
  { firstName: 'Lucas', lastName: 'Silva', countryCode: '+55', phone: '11988887777', label: 'Lucas Silva' },
];
