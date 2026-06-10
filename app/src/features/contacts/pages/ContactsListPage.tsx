import { useState } from 'react';
import { PeopleHeader } from '../components/list/PeopleHeader';
import { ContactsPanel } from '../components/list/ContactsPanel';
import { PeopleSidebar } from '../components/sidebar/PeopleSidebar';
import { AddContactDialog } from '../components/add/AddContactDialog';
import { ImportDialog } from '../components/import/ImportDialog';
import { useContactsStats } from '../hooks/useContactsStats';

export default function ContactsListPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const stats = useContactsStats();

  return (
    <div className="mx-auto flex max-w-7xl flex-col py-5 lg:h-full">
      <PeopleHeader
        contactCount={stats.contacts.total}
        trusteeCount={stats.trustees.active_count}
        overview={stats}
        onAdd={() => setAddOpen(true)}
        onImport={() => setImportOpen(true)}
      />

      {/* On lg the grid fills the remaining viewport height (rows pinned to 1fr)
          so only the contacts list scrolls; on mobile it flows and the page scrolls. */}
      <div className="mt-5 grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[340px_1fr] lg:grid-rows-[minmax(0,1fr)]">
        <PeopleSidebar />
        <ContactsPanel onAdd={() => setAddOpen(true)} />
      </div>

      <AddContactDialog open={addOpen} onOpenChange={setAddOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
