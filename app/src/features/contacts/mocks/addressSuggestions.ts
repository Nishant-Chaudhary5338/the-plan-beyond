import type { Address } from '../model/types';

export interface AddressSuggestion extends Address {
  label: string;
}

const SAMPLE: AddressSuggestion[] = [
  { label: '12 MG Road, Bengaluru', flat: '12', street: 'MG Road', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' },
  { label: '221B Baker Street, London', flat: '221B', street: 'Baker Street', city: 'London', state: 'England', postalCode: 'NW1 6XE', country: 'United Kingdom' },
  { label: '5th Avenue, New York', flat: '760', street: '5th Avenue', city: 'New York', state: 'NY', postalCode: '10019', country: 'United States' },
  { label: 'Marine Drive, Mumbai', flat: 'A-3', street: 'Marine Drive', city: 'Mumbai', state: 'Maharashtra', postalCode: '400020', country: 'India' },
  { label: 'Sheikh Zayed Road, Dubai', flat: 'Tower 2', street: 'Sheikh Zayed Road', city: 'Dubai', state: 'Dubai', postalCode: '00000', country: 'UAE' },
  { label: 'Orchard Road, Singapore', flat: '#12-01', street: 'Orchard Road', city: 'Singapore', state: '', postalCode: '238858', country: 'Singapore' },
];

/** Mock address autocomplete (stands in for a Places API in this demo). */
export function searchAddresses(query: string): AddressSuggestion[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return SAMPLE.filter((s) => s.label.toLowerCase().includes(q)).slice(0, 5);
}
