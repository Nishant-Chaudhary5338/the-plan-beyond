import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Popover, Checkbox } from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setFilter } from '../../model/contactsSlice';
import { GROUPS, RELATIONSHIPS } from '../../model/types';
import type { TriState } from '../../model/filters';

const TRI_OPTIONS: { value: TriState; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

type FilterPillProps = { label: string; active: boolean; count?: number } & ComponentPropsWithoutRef<'button'>;

// forwardRef + prop spread are REQUIRED: this is the Popover trigger (asChild), so
// Radix injects onClick/ref/aria here. Dropping them leaves the menu unable to open.
const FilterPill = forwardRef<HTMLButtonElement, FilterPillProps>(function FilterPill(
  { label, active, count, className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={active}
      {...rest}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition-colors',
        'ring-1 ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-accent/15 text-emerald-400 ring-accent/30' : 'bg-white/5 text-muted ring-line hover:bg-white/8',
        className
      )}
    >
      {label}
      {count ? <span className="rounded-full bg-accent/25 px-1.5 text-xs text-emerald-300">{count}</span> : null}
      <ChevronDown className="size-3.5 opacity-70" aria-hidden="true" />
    </button>
  );
});

function MenuOption({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-content hover:bg-white/8"
    >
      {children}
      {selected ? <Check className="size-4 text-emerald-400" /> : null}
    </button>
  );
}

/** The four segment filters from the live toolbar, wired to the Redux filter slice. */
export function SegmentFilters() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((s) => s.contactsUi.filters);

  const toggleGroup = (g: string) => {
    const next = filters.groups.includes(g)
      ? filters.groups.filter((x) => x !== g)
      : [...filters.groups, g];
    dispatch(setFilter({ key: 'groups', value: next }));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover trigger={<FilterPill label="Groups" active={filters.groups.length > 0} count={filters.groups.length} />}>
        {GROUPS.map((g) => (
          <MenuOption key={g} selected={filters.groups.includes(g)} onClick={() => toggleGroup(g)}>
            <span className="flex items-center gap-2">
              <Checkbox checked={filters.groups.includes(g)} readOnly tabIndex={-1} />
              {g}
            </span>
          </MenuOption>
        ))}
      </Popover>

      <Popover trigger={<FilterPill label="Beyond Circle" active={filters.beyondCircle !== 'all'} />}>
        {TRI_OPTIONS.map((o) => (
          <MenuOption
            key={o.value}
            selected={filters.beyondCircle === o.value}
            onClick={() => dispatch(setFilter({ key: 'beyondCircle', value: o.value }))}
          >
            {o.label}
          </MenuOption>
        ))}
      </Popover>

      <Popover trigger={<FilterPill label="Emergency" active={filters.emergency !== 'all'} />}>
        {TRI_OPTIONS.map((o) => (
          <MenuOption
            key={o.value}
            selected={filters.emergency === o.value}
            onClick={() => dispatch(setFilter({ key: 'emergency', value: o.value }))}
          >
            {o.label}
          </MenuOption>
        ))}
      </Popover>

      <Popover trigger={<FilterPill label="Relationships" active={!!filters.relationship} />}>
        <MenuOption
          selected={!filters.relationship}
          onClick={() => dispatch(setFilter({ key: 'relationship', value: null }))}
        >
          Any
        </MenuOption>
        {RELATIONSHIPS.map((r) => (
          <MenuOption
            key={r}
            selected={filters.relationship === r}
            onClick={() => dispatch(setFilter({ key: 'relationship', value: r }))}
          >
            {r}
          </MenuOption>
        ))}
      </Popover>
    </div>
  );
}
