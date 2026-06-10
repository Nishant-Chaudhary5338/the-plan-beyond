import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { WipPlaceholder } from '@/components/layout/WipPlaceholder';
import { RouteError } from '@/components/layout/RouteError';

const ContactsListPage = lazy(() => import('@/features/contacts/pages/ContactsListPage'));
const ContactDetailPage = lazy(() => import('@/features/contacts/pages/ContactDetailPage'));

const WIP_ROUTES = ['/', '/documents', '/photos', '/notes', '/vault', '/profile'];

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    // Catches lazy chunk-load failures and render errors within the shell so a
    // stale-deploy chunk surfaces as a recoverable "Reload" panel, not a hung spinner.
    errorElement: <RouteError />,
    children: [
      ...WIP_ROUTES.map((path) => ({ path, element: <WipPlaceholder /> })),
      { path: '/contacts', element: <ContactsListPage /> },
      { path: '/contacts/:id', element: <ContactDetailPage /> },
      { path: '*', element: <Navigate to="/contacts" replace /> },
    ],
  },
]);
