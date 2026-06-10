import { z } from 'zod';

/** Honorific titles offered in the detail form (matches the live Title dropdown). */
export const TITLES = ['Dr', 'Mr', 'Mrs', 'Ms', 'Prof'] as const;

/** Relationship options for the single-select. */
export const RELATIONSHIPS = [
  'Spouse',
  'Partner',
  'Parent',
  'Child',
  'Sibling',
  'Friend',
  'Colleague',
  'Advisor',
  'Other',
] as const;

/** Group / segment options for the multi-select. */
export const GROUPS = ['Family', 'Friends', 'Work', 'Legal', 'Medical', 'Financial'] as const;

export const phoneSchema = z.object({
  id: z.string(),
  /** Dial code incl. leading "+", e.g. "+91". */
  countryCode: z.string().regex(/^\+\d{1,4}$/),
  /** National number, digits only. */
  number: z.string().min(1),
  /** Full E.164 form, e.g. "+919867239020". */
  e164: z.string(),
  /** The primary phone used to identify/notify the contact. */
  isIdentifier: z.boolean().default(false),
  /** Optional metadata carried by the live API (preserved across edits). */
  phoneType: z.string().optional(),
  label: z.string().nullable().optional(),
  isVerified: z.boolean().optional(),
  supportsWhatsApp: z.boolean().optional(),
});

export const emailSchema = z.object({
  id: z.string(),
  email: z.string().email(),
});

export const addressSchema = z.object({
  flat: z.string().default(''),
  street: z.string().default(''),
  city: z.string().default(''),
  state: z.string().default(''),
  postalCode: z.string().default(''),
  country: z.string().default(''),
});

export const professionalSchema = z.object({
  nickname: z.string().default(''),
  company: z.string().default(''),
  jobTitle: z.string().default(''),
  website: z.string().default(''),
});

export const contactSchema = z.object({
  id: z.string(),
  title: z.enum(TITLES).optional(),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().default(''),
  lastName: z.string().default(''),
  dateOfBirth: z.string().optional(),
  anniversary: z.string().optional(),
  phones: z.array(phoneSchema).default([]),
  emails: z.array(emailSchema).default([]),
  address: addressSchema.default({}),
  professional: professionalSchema.default({}),
  notes: z.string().default(''),
  // Free-form to match the live app's custom relationship/group labels (e.g. "Brother").
  relationship: z.string().optional(),
  groups: z.array(z.string()).default([]),
  isEmergencyContact: z.boolean().default(false),
  isBeyondCircle: z.boolean().default(false),
  avatarUrl: z.string().nullable().optional(),
  createdAt: z.string(),
});

/** Payload to create a contact (the Add Contact modal). */
export const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().default(''),
  countryCode: z.string().regex(/^\+\d{1,4}$/),
  phone: z.string().min(1),
});

export const contactListResponseSchema = z.object({
  items: z.array(contactSchema),
  total: z.number().int().nonnegative(),
});

export type Title = (typeof TITLES)[number];
/** Preset suggestions; the field itself accepts any string (custom labels). */
export type Relationship = (typeof RELATIONSHIPS)[number];
export type Group = (typeof GROUPS)[number];
export type Phone = z.infer<typeof phoneSchema>;
export type Email = z.infer<typeof emailSchema>;
export type Address = z.infer<typeof addressSchema>;
export type Professional = z.infer<typeof professionalSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type ContactListResponse = z.infer<typeof contactListResponseSchema>;
