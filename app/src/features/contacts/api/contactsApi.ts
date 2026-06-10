import { baseApi } from '@/app/baseApi';
import {
  contactListResponseSchema,
  type Contact,
  type ContactListResponse,
  type CreateContactInput,
} from '../model/types';
import {
  wireContactSchema,
  fromWireContact,
  toWireContact,
  toWireCreate,
} from '../model/wire';
import {
  peopleOverviewSchema,
  trusteeInviteSchema,
  type PeopleOverview,
  type TrusteeInvite,
} from '../model/overview';
import { encodeFilters, type ContactFilters } from '../model/filters';

const parseWire = (raw: unknown): Contact => fromWireContact(wireContactSchema.parse(raw));

export interface ImportResult {
  imported: number;
  skipped: number;
}

/**
 * Contacts endpoints injected into the shared `baseApi`. Base URL, headers, and
 * cache tags live on `baseApi`; this file owns only the contacts contract.
 */
export const contactsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPeopleOverview: build.query<PeopleOverview, void>({
      query: () => '/people',
      transformResponse: (raw) => peopleOverviewSchema.parse(raw),
      providesTags: [{ type: 'ContactList', id: 'LIST' }],
    }),

    getContacts: build.query<ContactListResponse, Partial<ContactFilters>>({
      query: (filters) => `/contacts${encodeFilters(filters)}`,
      transformResponse: (raw) => contactListResponseSchema.parse(raw),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((c) => ({ type: 'Contact' as const, id: c.id })),
              { type: 'ContactList' as const, id: 'LIST' },
            ]
          : [{ type: 'ContactList' as const, id: 'LIST' }],
    }),

    getContact: build.query<Contact, string>({
      query: (id) => `/contacts/${id}`,
      transformResponse: parseWire,
      providesTags: (_r, _e, id) => [{ type: 'Contact', id }],
    }),

    createContact: build.mutation<Contact, CreateContactInput>({
      query: (input) => ({ url: '/contacts', method: 'POST', body: toWireCreate(input) }),
      transformResponse: parseWire,
      invalidatesTags: [{ type: 'ContactList', id: 'LIST' }],
    }),

    updateContact: build.mutation<Contact, { id: string; contact: Contact }>({
      query: ({ id, contact }) => ({
        url: `/contacts/${id}`,
        method: 'PUT',
        body: toWireContact(contact),
      }),
      transformResponse: parseWire,
      // Optimistic: detail view reflects the save immediately, rolls back on error.
      async onQueryStarted({ id, contact }, { dispatch, queryFulfilled }) {
        const undo = dispatch(
          contactsApi.util.updateQueryData('getContact', id, (draft) => {
            Object.assign(draft, contact);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          undo.undo();
        }
      },
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Contact', id },
        { type: 'ContactList', id: 'LIST' },
      ],
    }),

    deleteContact: build.mutation<{ success: boolean; message: string; id: string }, string>({
      query: (id) => ({ url: `/contacts/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'ContactList', id: 'LIST' }],
    }),

    inviteTrustee: build.mutation<TrusteeInvite, string>({
      query: (contactId) => ({
        url: '/trustees/invite',
        method: 'POST',
        body: { contact_id: contactId },
      }),
      transformResponse: (raw) => trusteeInviteSchema.parse(raw),
      invalidatesTags: [{ type: 'ContactList', id: 'LIST' }],
    }),

    importVcf: build.mutation<ImportResult, { contacts: CreateContactInput[] }>({
      query: (body) => ({ url: '/contacts/import/vcf', method: 'POST', body }),
      invalidatesTags: [{ type: 'ContactList', id: 'LIST' }],
    }),

    importGoogle: build.mutation<ImportResult, { contacts: CreateContactInput[] }>({
      query: (body) => ({ url: '/contacts/import/google', method: 'POST', body }),
      invalidatesTags: [{ type: 'ContactList', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetPeopleOverviewQuery,
  useGetContactsQuery,
  useGetContactQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
  useInviteTrusteeMutation,
  useImportVcfMutation,
  useImportGoogleMutation,
} = contactsApi;
