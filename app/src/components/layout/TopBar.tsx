import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Zap, User } from 'lucide-react';
import { Button, IconButton, toast } from '@/components/ui';
import { useAppDispatch } from '@/app/hooks';
import { setFilter } from '@/features/contacts/model/contactsSlice';

/** Global top bar: command search (⌘K), upgrade, account. */
export function TopBar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  // Own local state — intentionally NOT the contacts list filter, so typing in
  // the list's search box doesn't mirror up here (and vice versa). Submitting
  // applies the query to the contacts list and navigates there.
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    dispatch(setFilter({ key: 'search', value: query }));
    navigate('/contacts');
  };

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 px-5 py-4 sm:px-8">
      <form onSubmit={onSubmit} role="search" className="relative ml-auto hidden w-full max-w-md sm:block">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people…"
          aria-label="Search people"
          aria-keyshortcuts="Meta+K Control+K"
          className="h-10 w-full rounded-full bg-surface pl-10 pr-12 text-sm text-content placeholder:text-muted ring-1 ring-inset ring-line transition-colors hover:bg-surface-raised focus:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-muted">
          ⌘K
        </kbd>
      </form>

      {/* TODO(scope): wire to billing when it exists. Honest about being out of
          scope rather than a silent dead-end (matches the Invite affordance). */}
      <Button
        variant="subtle"
        size="sm"
        className="ml-auto sm:ml-0"
        onClick={() => toast.info('Plans & upgrades land in a later milestone — this build ships “My People”.')}
      >
        <Zap className="size-4" />
        Upgrade
      </Button>
      {/* Account opens the profile area (the same place the nav's Profile links to). */}
      <IconButton label="Account" variant="solid" onClick={() => navigate('/profile')}>
        <User className="size-4" />
      </IconButton>
    </header>
  );
}
