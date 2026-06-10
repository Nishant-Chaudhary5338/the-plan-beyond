import { describe, it, expect } from 'vitest';
import { fromWireContact, toWireContact, type WireContact } from './wire';

const sample: WireContact = {
  id: 'c1',
  title: 'Dr',
  first_name: 'Yashu',
  middle_name: null,
  last_name: 'Singh',
  nickname: null,
  company: 'Acme',
  job_title: 'Engineer',
  website: null,
  relationships: ['Brother'],
  groups: ['Family'],
  address_line_1: 'A-3',
  address_line_2: 'Marine Drive',
  city: 'Mumbai',
  state: 'MH',
  postal_code: '400020',
  country: 'India',
  date_of_birth: '1996-09-28',
  anniversary: '2020-01-01',
  is_emergency_contact: true,
  share_after_death: true,
  profile_image_url: 'https://example.com/a.jpg',
  notes: 'hi',
  email_list: [{ id: 'e1', email: 'y@example.com' }],
  phone_list: [
    {
      id: 'p1',
      country_code: '+91',
      phone_number: '8988977684',
      phone_type: 'work',
      label: 'Office',
      is_primary: true,
      is_verified: true,
      supports_whatsapp: true,
      full_number: '+918988977684',
      e164: '+918988977684',
    },
  ],
  created_at: '2026-06-09T21:08:22Z',
};

describe('wire mappers', () => {
  it('preserves DOB, anniversary, and avatar through a round-trip (BUG-1)', () => {
    const back = toWireContact(fromWireContact(sample));
    expect(back.date_of_birth).toBe('1996-09-28');
    expect(back.anniversary).toBe('2020-01-01');
    expect(back.profile_image_url).toBe('https://example.com/a.jpg');
  });

  it('preserves phone metadata through a round-trip (BUG-2)', () => {
    const phone = toWireContact(fromWireContact(sample)).phone_list[0]!;
    expect(phone.phone_type).toBe('work');
    expect(phone.label).toBe('Office');
    expect(phone.is_verified).toBe(true);
    expect(phone.supports_whatsapp).toBe(true);
  });

  it('keeps free-form relationship and custom-title handling (BUG-3)', () => {
    const internal = fromWireContact(sample);
    expect(internal.relationship).toBe('Brother');
    // A title outside the preset set is intentionally not adopted by the fixed dropdown.
    const custom = fromWireContact({ ...sample, title: 'Sir' });
    expect(custom.title).toBeUndefined();
  });

  it('maps core fields correctly', () => {
    const internal = fromWireContact(sample);
    expect(internal.firstName).toBe('Yashu');
    expect(internal.address.flat).toBe('A-3');
    expect(internal.professional.company).toBe('Acme');
    expect(internal.isBeyondCircle).toBe(true);
    expect(internal.phones[0]?.isIdentifier).toBe(true);
  });
});
