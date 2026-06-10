import { isValidPhoneNumber } from 'libphonenumber-js';
import {
  contactSchema,
  createContactSchema,
  type Contact,
  type ContactListResponse,
  type CreateContactInput,
} from '../model/types';
import { makeSeedContacts } from '../mocks/seed';
import { filterContacts, displayName } from '../utils/filterContacts';
import type { ContactFilters } from '../model/filters';
import type { PeopleOverview, TrusteeInvite } from '../model/overview';
import { TRUSTEE_LIMIT } from '../model/constants';
import { genId } from '../../../lib/id';

const SELF_USER_ID = 'bd749670-ed9d-48ef-bba5-6ac6608074e4';

/** Thrown by the service; carries the HTTP status the transport should emit. */
export class ServiceError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
  }
}

function buildContact(input: CreateContactInput): Contact {
  const draft: Contact = {
    id: genId('contact'),
    firstName: input.firstName,
    middleName: '',
    lastName: input.lastName ?? '',
    phones: [
      { id: genId(), countryCode: input.countryCode, number: input.phone, e164: `${input.countryCode}${input.phone}`, isIdentifier: true },
    ],
    emails: [],
    address: { flat: '', street: '', city: '', state: '', postalCode: '', country: '' },
    professional: { nickname: '', company: '', jobTitle: '', website: '' },
    notes: '',
    groups: [],
    isEmergencyContact: false,
    isBeyondCircle: false,
    createdAt: new Date().toISOString(),
  };
  return contactSchema.parse(draft);
}

/**
 * In-memory contacts service shared by the Express mock and MSW handlers.
 * Keeps dev, unit/integration tests, and e2e on one identical implementation.
 */
export function createContactsService(seed: Contact[] = makeSeedContacts()) {
  let contacts: Contact[] = seed.map((c) => ({ ...c }));
  let trusteeInvites: TrusteeInvite[] = [];

  function validateCreate(raw: unknown): CreateContactInput {
    const parsed = createContactSchema.safeParse(raw);
    if (!parsed.success) throw new ServiceError(400, 'Request validation failed');
    const input = parsed.data;
    const e164 = `${input.countryCode}${input.phone}`;
    if (!isValidPhoneNumber(e164)) throw new ServiceError(400, 'Request validation failed');
    if (contacts.some((c) => c.phones.some((p) => p.e164 === e164))) {
      throw new ServiceError(409, 'A contact with this number already exists');
    }
    return input;
  }

  return {
    list(filters: Partial<ContactFilters>): ContactListResponse {
      return filterContacts(contacts, filters);
    },

    /** The `/people` aggregate: contacts + trustees/keyholders/notify-circle summaries. */
    overview(): PeopleOverview {
      const beyond = contacts.filter((c) => c.isBeyondCircle).length;
      const active = trusteeInvites.filter((t) => t.status === 'accepted').length;
      const pending = trusteeInvites.filter((t) => t.status === 'pending').length;
      return {
        contacts: { total: contacts.length },
        trustees: {
          active_count: active,
          pending_count: pending,
          pending_received_count: 0,
          max_allowed: TRUSTEE_LIMIT,
          status: active >= TRUSTEE_LIMIT ? 'ok' : 'at_risk',
        },
        keyholders: {
          accepted_count: 0,
          confirmed_event_count: 0,
          total_event_count: 0,
          pending_count: 0,
        },
        notify_circle: { enabled: true, mode: 'all', total_recipients: beyond },
      };
    },

    /** Invite a contact to become a trustee (`POST /trustees/invite`). */
    inviteTrustee(raw: unknown): TrusteeInvite {
      const contactId = (raw as { contact_id?: unknown })?.contact_id;
      if (typeof contactId !== 'string') throw new ServiceError(400, 'Request validation failed');
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) throw new ServiceError(404, 'Contact not found');
      if (trusteeInvites.some((t) => t.contact_id === contactId && t.status !== 'declined')) {
        throw new ServiceError(409, 'This contact has already been invited');
      }
      const open = trusteeInvites.filter((t) => t.status !== 'declined').length;
      if (open >= TRUSTEE_LIMIT) throw new ServiceError(403, 'Trustee limit reached');
      const primary = contact.phones.find((p) => p.isIdentifier) ?? contact.phones[0];
      const invite: TrusteeInvite = {
        id: genId(),
        user_id: SELF_USER_ID,
        contact_id: contactId,
        status: 'pending',
        invited_at: new Date().toISOString(),
        accepted_at: null,
        contact_name: displayName(contact),
        contact_email: contact.emails[0]?.email ?? null,
        contact_phone: primary?.e164 ?? null,
      };
      trusteeInvites = [...trusteeInvites, invite];
      return invite;
    },

    get(id: string): Contact {
      const found = contacts.find((c) => c.id === id);
      if (!found) throw new ServiceError(404, 'Contact not found');
      return found;
    },

    create(raw: unknown): Contact {
      const input = validateCreate(raw);
      const contact = buildContact(input);
      contacts = [contact, ...contacts];
      return contact;
    },

    update(id: string, patch: Partial<Contact>): Contact {
      const idx = contacts.findIndex((c) => c.id === id);
      if (idx < 0) throw new ServiceError(404, 'Contact not found');
      const merged = contactSchema.parse({ ...contacts[idx], ...patch, id });
      contacts = contacts.map((c, i) => (i === idx ? merged : c));
      return merged;
    },

    remove(id: string): { success: true; message: string; id: string } {
      if (!contacts.some((c) => c.id === id)) throw new ServiceError(404, 'Contact not found');
      contacts = contacts.filter((c) => c.id !== id);
      return { success: true, message: 'Contact deleted', id };
    },

    importMany(rawList: unknown): { imported: number; skipped: number } {
      if (!Array.isArray(rawList)) throw new ServiceError(400, 'Request validation failed');
      let imported = 0;
      let skipped = 0;
      for (const raw of rawList) {
        try {
          const input = validateCreate(raw);
          contacts = [buildContact(input), ...contacts];
          imported += 1;
        } catch {
          skipped += 1;
        }
      }
      return { imported, skipped };
    },

    reset(next: Contact[] = makeSeedContacts()): void {
      contacts = next.map((c) => ({ ...c }));
      trusteeInvites = [];
    },
  };
}

export type ContactsService = ReturnType<typeof createContactsService>;
