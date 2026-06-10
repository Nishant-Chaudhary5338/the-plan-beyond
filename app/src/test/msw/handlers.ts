import { http, HttpResponse } from 'msw';
import {
  createContactsService,
  ServiceError,
  type ContactsService,
} from '@/features/contacts/api/contactsService';
import { decodeFilters } from '@/features/contacts/model/filters';
import {
  toWireContact,
  fromWireContact,
  fromWireCreate,
  wireContactSchema,
} from '@/features/contacts/model/wire';

/** Shared service instance for tests; reset between cases via `resetService()`. */
export let service: ContactsService = createContactsService();
export function resetService(seed?: Parameters<typeof createContactsService>[0]): void {
  service = createContactsService(seed);
}

const filtersFromUrl = (url: string) => decodeFilters(new URL(url).searchParams);

function respond(fn: () => unknown, okStatus = 200) {
  try {
    return HttpResponse.json(fn() as object, { status: okStatus });
  } catch (err) {
    if (err instanceof ServiceError) {
      return HttpResponse.json({ message: err.message }, { status: err.status });
    }
    return HttpResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}

export const handlers = [
  http.get('/api/people', () => respond(() => service.overview())),

  http.get('/api/contacts', ({ request }) => respond(() => service.list(filtersFromUrl(request.url)))),

  http.get('/api/contacts/:id', ({ params }) =>
    respond(() => toWireContact(service.get(String(params.id))))
  ),

  http.post('/api/contacts', async ({ request }) => {
    const body = await request.json();
    return respond(() => toWireContact(service.create(fromWireCreate(body))), 201);
  }),

  http.put('/api/contacts/:id', async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return respond(() => {
      const current = toWireContact(service.get(String(params.id)));
      const merged = wireContactSchema.parse({ ...current, ...body, id: String(params.id) });
      return toWireContact(service.update(String(params.id), fromWireContact(merged)));
    });
  }),

  http.delete('/api/contacts/:id', ({ params }) => respond(() => service.remove(String(params.id)))),

  http.post('/api/trustees/invite', async ({ request }) => {
    const body = await request.json();
    return respond(() => service.inviteTrustee(body), 201);
  }),

  http.post('/api/contacts/import/vcf', async ({ request }) => {
    const body = (await request.json()) as { contacts?: unknown };
    return respond(() => service.importMany(body.contacts));
  }),

  http.post('/api/contacts/import/google', async ({ request }) => {
    const body = (await request.json()) as { contacts?: unknown };
    return respond(() => service.importMany(body.contacts));
  }),
];
