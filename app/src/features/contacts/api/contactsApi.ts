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
      // Only the LIST tag — mutations invalidate `ContactList/LIST` to refetch the
      // page. We intentionally don't provide per-item `Contact` tags here: no
      // mutation invalidates an individual contact (detail stays fresh via the
      // optimistic patch in `updateContact`), so per-row tags would imply
      // refetch behavior that isn't wired.
      providesTags: [{ type: 'ContactList', id: 'LIST' }],
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
      // Optimistic: the detail view reflects the save immediately and rolls back
      // on error. We replace the whole cached value (not Object.assign-merge, which
      // would leave removed fields like a deleted phone behind) and patch the cache
      // with the server's canonicalised response on success — so we deliberately do
      // NOT invalidate the `Contact` tag here (that would refetch and defeat the
      // optimistic update). Only the list tag is invalidated, for derived counts.
      async onQueryStarted({ id, contact }, { dispatch, queryFulfilled }) {
        const undo = dispatch(
          contactsApi.util.updateQueryData('getContact', id, () => contact)
        );
        try {
          const { data: saved } = await queryFulfilled;
          dispatch(contactsApi.util.updateQueryData('getContact', id, () => saved));
        } catch {
          undo.undo();
        }
      },
      invalidatesTags: [{ type: 'ContactList', id: 'LIST' }],
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
