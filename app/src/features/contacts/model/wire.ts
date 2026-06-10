import { z } from 'zod';
import type { Contact, CreateContactInput, Phone } from './types';
import { TITLES } from './types';
import { genId } from '../../../lib/id';

/**
 * Wire shapes for the live contact create/detail API (snake_case). The app keeps
 * a clean camelCase internal model; these schemas + mappers are the anti-corruption
 * layer between the two. Map at the API boundary only — nothing else changes.
 */

export const wirePhoneSchema = z.object({
  id: z.string().optional(),
  country_code: z.string(),
  phone_number: z.string(),
  phone_type: z.string().nullable().default('mobile'),
  label: z.string().nullable().default(null),
  is_primary: z.boolean().default(false),
  is_verified: z.boolean().default(false),
  supports_whatsapp: z.boolean().default(false),
  full_number: z.string().optional(),
  e164: z.string().optional(),
});

export const wireEmailSchema = z.object({
  id: z.string().optional(),
  email: z.string(),
});

export const wireContactSchema = z
  .object({
    id: z.string(),
    title: z.string().nullable().default(null),
    first_name: z.string(),
    middle_name: z.string().nullable().default(null),
    last_name: z.string().nullable().default(null),
    nickname: z.string().nullable().default(null),
    company: z.string().nullable().default(null),
    job_title: z.string().nullable().default(null),
    website: z.string().nullable().default(null),
    relationships: z.array(z.string()).default([]),
    groups: z.array(z.string()).default([]),
    address_line_1: z.string().nullable().default(null),
    address_line_2: z.string().nullable().default(null),
    city: z.string().nullable().default(null),
    state: z.string().nullable().default(null),
    postal_code: z.string().nullable().default(null),
    country: z.string().nullable().default(null),
    date_of_birth: z.string().nullable().default(null),
    anniversary: z.string().nullable().default(null),
    is_emergency_contact: z.boolean().default(false),
    share_after_death: z.boolean().default(false),
    profile_image_url: z.string().nullable().default(null),
    notes: z.string().nullable().default(null),
    email_list: z.array(wireEmailSchema).default([]),
    phone_list: z.array(wirePhoneSchema).default([]),
    created_at: z.string().default(''),
  })
  .passthrough();

export type WireContact = z.infer<typeof wireContactSchema>;

/** Real wire contact → internal Contact. */
export function fromWireContact(w: WireContact): Contact {
  const phones: Phone[] = w.phone_list.map((p) => ({
    id: p.id ?? genId('phone'),
    countryCode: p.country_code,
    number: p.phone_number,
    e164: p.e164 ?? p.full_number ?? `${p.country_code}${p.phone_number}`,
    isIdentifier: p.is_primary,
    phoneType: p.phone_type ?? undefined,
    label: p.label,
    isVerified: p.is_verified,
    supportsWhatsApp: p.supports_whatsapp,
  }));
  // The UI's title is a fixed dropdown; non-preset titles aren't supported.
  const title = TITLES.find((t) => t === w.title);
  // Single-relationship by product decision (the detail form is single-select).
  const relationship = w.relationships[0];
  return {
    id: w.id,
    ...(title ? { title } : {}),
    firstName: w.first_name,
    middleName: w.middle_name ?? '',
    lastName: w.last_name ?? '',
    phones,
    emails: w.email_list.map((e) => ({ id: e.id ?? genId('email'), email: e.email })),
    address: {
      flat: w.address_line_1 ?? '',
      street: w.address_line_2 ?? '',
      city: w.city ?? '',
      state: w.state ?? '',
      postalCode: w.postal_code ?? '',
      country: w.country ?? '',
    },
    professional: {
      nickname: w.nickname ?? '',
      company: w.company ?? '',
      jobTitle: w.job_title ?? '',
      website: w.website ?? '',
    },
    notes: w.notes ?? '',
    ...(relationship ? { relationship } : {}),
    groups: w.groups,
    isEmergencyContact: w.is_emergency_contact,
    isBeyondCircle: w.share_after_death,
    avatarUrl: w.profile_image_url ?? null,
    ...(w.date_of_birth ? { dateOfBirth: w.date_of_birth } : {}),
    ...(w.anniversary ? { anniversary: w.anniversary } : {}),
    createdAt: w.created_at,
  };
}

/** Internal Contact → wire contact (what the mock returns). */
export function toWireContact(c: Contact): WireContact {
  return {
    id: c.id,
    title: c.title ?? null,
    first_name: c.firstName,
    middle_name: c.middleName || null,
    last_name: c.lastName || null,
    nickname: c.professional.nickname || null,
    company: c.professional.company || null,
    job_title: c.professional.jobTitle || null,
    website: c.professional.website || null,
    relationships: c.relationship ? [c.relationship] : [],
    groups: c.groups,
    address_line_1: c.address.flat || null,
    address_line_2: c.address.street || null,
    city: c.address.city || null,
    state: c.address.state || null,
    postal_code: c.address.postalCode || null,
    country: c.address.country || null,
    date_of_birth: c.dateOfBirth ?? null,
    anniversary: c.anniversary ?? null,
    is_emergency_contact: c.isEmergencyContact,
    share_after_death: c.isBeyondCircle,
    profile_image_url: c.avatarUrl ?? null,
    notes: c.notes || null,
    email_list: c.emails.map((e) => ({ id: e.id, email: e.email })),
    phone_list: c.phones.map((p) => ({
      id: p.id,
      country_code: p.countryCode,
      phone_number: p.number,
      phone_type: p.phoneType ?? 'mobile',
      label: p.label ?? null,
      is_primary: p.isIdentifier,
      is_verified: p.isVerified ?? false,
      supports_whatsapp: p.supportsWhatsApp ?? false,
      full_number: p.e164,
      e164: p.e164,
    })),
    created_at: c.createdAt,
  };
}

/** Internal create input → wire create request body. */
export function toWireCreate(input: CreateContactInput): Record<string, unknown> {
  return {
    first_name: input.firstName,
    last_name: input.lastName ?? '',
    phone_list: [
      {
        country_code: input.countryCode,
        phone_number: input.phone,
        is_primary: true,
        phone_type: 'mobile',
        supports_whatsapp: false,
      },
    ],
    share_after_death: false,
    is_emergency_contact: false,
  };
}

export const wireCreateSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().default(''),
  phone_list: z.array(wirePhoneSchema).min(1),
  share_after_death: z.boolean().default(false),
  is_emergency_contact: z.boolean().default(false),
});

/** Wire create request → internal create input (used by the mock). */
export function fromWireCreate(raw: unknown): CreateContactInput {
  const w = wireCreateSchema.parse(raw);
  const primary = w.phone_list.find((p) => p.is_primary) ?? w.phone_list[0]!;
  return {
    firstName: w.first_name,
    lastName: w.last_name,
    countryCode: primary.country_code,
    phone: primary.phone_number,
  };
}
