import type { Contact, Group, Relationship } from '../model/types';

interface SeedEntry {
  first: string;
  last: string;
  cc: string;
  num: string;
  relationship?: Relationship;
  groups?: Group[];
  beyond?: boolean;
  emergency?: boolean;
  company?: string;
  jobTitle?: string;
  city?: string;
}

const RAW: SeedEntry[] = [
  { first: 'Amit', last: 'Bansal', cc: '+91', num: '9867239020', relationship: 'Friend', groups: ['Friends'], beyond: true, company: 'Northwind', jobTitle: 'Architect', city: 'Mumbai' },
  { first: 'Ananya', last: 'Iyer', cc: '+91', num: '9810012345', relationship: 'Sibling', groups: ['Family'], beyond: true, emergency: true, city: 'Bengaluru' },
  { first: 'Brian', last: 'OConnor', cc: '+1', num: '4155550142', relationship: 'Colleague', groups: ['Work'], company: 'Atlas Labs', jobTitle: 'PM', city: 'San Francisco' },
  { first: 'Chen', last: 'Wei', cc: '+65', num: '81234567', relationship: 'Friend', groups: ['Friends'], city: 'Singapore' },
  { first: 'Deepa', last: 'Nair', cc: '+91', num: '9745098765', relationship: 'Parent', groups: ['Family'], beyond: true, emergency: true, city: 'Kochi' },
  { first: 'Elena', last: 'Petrova', cc: '+44', num: '7700900123', relationship: 'Advisor', groups: ['Legal'], company: 'Petrova & Co', jobTitle: 'Solicitor', city: 'London' },
  { first: 'Farhan', last: 'Sheikh', cc: '+971', num: '501234567', relationship: 'Friend', groups: ['Friends'], city: 'Dubai' },
  { first: 'Gaurav', last: 'Malhotra', cc: '+91', num: '9920011223', relationship: 'Colleague', groups: ['Work'], beyond: true, company: 'Finser', jobTitle: 'CFO', city: 'Mumbai' },
  { first: 'Hannah', last: 'Schmidt', cc: '+49', num: '15123456789', relationship: 'Friend', groups: ['Friends'], city: 'Berlin' },
  { first: 'Ishita', last: 'Rao', cc: '+91', num: '9663012398', relationship: 'Sibling', groups: ['Family'], beyond: true, city: 'Hyderabad' },
  { first: 'Jacob', last: 'Mathew', cc: '+91', num: '9847011223', relationship: 'Friend', groups: ['Medical'], company: 'City Hospital', jobTitle: 'Physician', city: 'Kochi' },
  { first: 'Kavya', last: 'Reddy', cc: '+91', num: '9701123456', relationship: 'Friend', groups: ['Friends'], emergency: true, city: 'Hyderabad' },
  { first: 'Liam', last: 'Murphy', cc: '+353', num: '851234567', relationship: 'Colleague', groups: ['Work'], company: 'Shamrock', jobTitle: 'Engineer', city: 'Dublin' },
  { first: 'Meera', last: 'Krishnan', cc: '+91', num: '9886012345', relationship: 'Parent', groups: ['Family'], beyond: true, emergency: true, city: 'Chennai' },
  { first: 'Nikhil', last: 'Verma', cc: '+91', num: '9818234567', relationship: 'Friend', groups: ['Friends', 'Work'], beyond: true, company: 'Verma Realty', jobTitle: 'Director', city: 'Delhi' },
  { first: 'Olivia', last: 'Brown', cc: '+1', num: '2125550199', relationship: 'Advisor', groups: ['Financial'], company: 'Brown Wealth', jobTitle: 'Advisor', city: 'New York' },
  { first: 'Priya', last: 'Shah', cc: '+91', num: '9833123456', relationship: 'Spouse', groups: ['Family'], beyond: true, emergency: true, city: 'Mumbai' },
  { first: 'Quentin', last: 'Dubois', cc: '+33', num: '612345678', relationship: 'Friend', groups: ['Friends'], city: 'Paris' },
  { first: 'Rahul', last: 'Gupta', cc: '+91', num: '9811045678', relationship: 'Colleague', groups: ['Work'], company: 'TechNova', jobTitle: 'CTO', city: 'Gurgaon' },
  { first: 'Sara', last: 'Khan', cc: '+91', num: '9920123789', relationship: 'Friend', groups: ['Friends'], beyond: true, city: 'Mumbai' },
  { first: 'Tarun', last: 'Pillai', cc: '+91', num: '9745123456', relationship: 'Sibling', groups: ['Family'], city: 'Trivandrum' },
  { first: 'Uma', last: 'Desai', cc: '+91', num: '9824123456', relationship: 'Parent', groups: ['Family'], beyond: true, emergency: true, city: 'Ahmedabad' },
  { first: 'Victor', last: 'Santos', cc: '+55', num: '11987654321', relationship: 'Friend', groups: ['Friends'], city: 'Sao Paulo' },
  { first: 'Wendy', last: 'Lee', cc: '+852', num: '51234567', relationship: 'Colleague', groups: ['Work'], company: 'Harbour Co', jobTitle: 'Analyst', city: 'Hong Kong' },
  { first: 'Xavier', last: 'Fernandes', cc: '+91', num: '9822123456', relationship: 'Friend', groups: ['Friends'], city: 'Goa' },
  { first: 'Yamini', last: 'Joshi', cc: '+91', num: '9890123456', relationship: 'Child', groups: ['Family'], beyond: true, city: 'Pune' },
  { first: 'Zara', last: 'Ahmed', cc: '+91', num: '9870123456', relationship: 'Friend', groups: ['Medical'], emergency: true, company: 'Wellness Clinic', jobTitle: 'Dentist', city: 'Lucknow' },
  { first: 'Arjun', last: 'Kapoor', cc: '+91', num: '9811223344', relationship: 'Friend', groups: ['Friends'], city: 'Delhi' },
  { first: 'Bhavna', last: 'Sethi', cc: '+91', num: '9899112233', relationship: 'Colleague', groups: ['Work'], company: 'Sethi Group', city: 'Delhi' },
  { first: 'Daniel', last: 'Cohen', cc: '+972', num: '521234567', relationship: 'Advisor', groups: ['Legal'], company: 'Cohen Legal', jobTitle: 'Counsel', city: 'Tel Aviv' },
];

const DAY = 86_400_000;
const EPOCH = Date.UTC(2026, 0, 1);

function buildContact(entry: SeedEntry, i: number): Contact {
  const createdAt = new Date(EPOCH + i * DAY).toISOString();
  return {
    id: `seed-${String(i + 1).padStart(3, '0')}`,
    firstName: entry.first,
    middleName: '',
    lastName: entry.last,
    phones: [
      {
        id: `${i}-p1`,
        countryCode: entry.cc,
        number: entry.num,
        e164: `${entry.cc}${entry.num}`,
        isIdentifier: true,
      },
    ],
    emails: [{ id: `${i}-e1`, email: `${entry.first.toLowerCase()}.${entry.last.toLowerCase()}@example.com` }],
    address: { flat: '', street: '', city: entry.city ?? '', state: '', postalCode: '', country: '' },
    professional: { nickname: '', company: entry.company ?? '', jobTitle: entry.jobTitle ?? '', website: '' },
    notes: '',
    ...(entry.relationship ? { relationship: entry.relationship } : {}),
    groups: entry.groups ?? [],
    isEmergencyContact: entry.emergency ?? false,
    isBeyondCircle: entry.beyond ?? false,
    createdAt,
  };
}

/** Deterministic seed dataset — identical for dev server, MSW, and e2e. */
export function makeSeedContacts(): Contact[] {
  return RAW.map(buildContact);
}
