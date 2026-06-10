import { describe, it, expect, beforeEach } from 'vitest';
import { createContactsService, ServiceError, type ContactsService } from './contactsService';

let svc: ContactsService;
beforeEach(() => {
  svc = createContactsService();
});

const valid = { firstName: 'Test', lastName: 'User', countryCode: '+91', phone: '9876512345' };

describe('contactsService.create', () => {
  it('creates a contact from a valid payload', () => {
    const before = svc.list({}).total;
    const created = svc.create(valid);
    expect(created.firstName).toBe('Test');
    expect(created.phones[0]?.e164).toBe('+919876512345');
    expect(created.phones[0]?.isIdentifier).toBe(true);
    expect(svc.list({}).total).toBe(before + 1);
  });

  it('rejects a missing first name with a 400', () => {
    expect(() => svc.create({ ...valid, firstName: '' })).toThrow(ServiceError);
    try {
      svc.create({ ...valid, firstName: '' });
    } catch (e) {
      expect((e as ServiceError).status).toBe(400);
    }
  });

  it('rejects an invalid phone number', () => {
    expect(() => svc.create({ ...valid, phone: '123' })).toThrowError(/validation failed/i);
  });

  it('rejects a duplicate number with a 409', () => {
    svc.create(valid);
    try {
      svc.create(valid);
      throw new Error('expected throw');
    } catch (e) {
      expect((e as ServiceError).status).toBe(409);
    }
  });
});

describe('contactsService update / remove', () => {
  it('updates an existing contact', () => {
    const target = svc.list({}).items[0]!;
    const updated = svc.update(target.id, { isBeyondCircle: !target.isBeyondCircle });
    expect(updated.isBeyondCircle).toBe(!target.isBeyondCircle);
    expect(svc.get(target.id).isBeyondCircle).toBe(!target.isBeyondCircle);
  });

  it('throws 404 when updating a missing contact', () => {
    try {
      svc.update('nope', { notes: 'x' });
    } catch (e) {
      expect((e as ServiceError).status).toBe(404);
    }
  });

  it('removes a contact', () => {
    const target = svc.list({}).items[0]!;
    svc.remove(target.id);
    expect(() => svc.get(target.id)).toThrow(ServiceError);
  });
});

describe('contactsService.inviteTrustee', () => {
  it('creates a pending invite and bumps the overview count', () => {
    const target = svc.list({}).items[0]!;
    const invite = svc.inviteTrustee({ contact_id: target.id });
    expect(invite.status).toBe('pending');
    expect(invite.contact_id).toBe(target.id);
    expect(svc.overview().trustees.pending_count).toBe(1);
  });

  it('rejects a duplicate invite', () => {
    const target = svc.list({}).items[0]!;
    svc.inviteTrustee({ contact_id: target.id });
    try {
      svc.inviteTrustee({ contact_id: target.id });
      throw new Error('expected throw');
    } catch (e) {
      expect((e as ServiceError).status).toBe(409);
    }
  });

  it('enforces the trustee limit', () => {
    const [a, b, c] = svc.list({}).items;
    svc.inviteTrustee({ contact_id: a!.id });
    svc.inviteTrustee({ contact_id: b!.id });
    try {
      svc.inviteTrustee({ contact_id: c!.id });
      throw new Error('expected throw');
    } catch (e) {
      expect((e as ServiceError).status).toBe(403);
    }
  });
});

describe('contactsService.importMany', () => {
  it('imports valid rows and skips invalid ones', () => {
    const result = svc.importMany([
      valid,
      { ...valid, phone: '9876512346' },
      { firstName: '', countryCode: '+91', phone: '1' },
    ]);
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(1);
  });
});
