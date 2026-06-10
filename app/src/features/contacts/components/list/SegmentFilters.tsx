import { forwardRef, useRef, type KeyboardEvent } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Popover, Checkbox, InfoPopover } from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setFilter } from '../../model/contactsSlice';
import { GROUPS, RELATIONSHIPS } from '../../model/types';
import { ROLE_DEFINITIONS } from '../../model/microcopy';
import type { TriState } from '../../model/filters';

const TRI_OPTIONS: { value: TriState; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

interface MenuOpt {
  key: string;
  label: ReactNode;
  selected: boolean;
  onSelect: () => void;
}

/**
 * An accessible menu of filter options. Exposes correct role/name/value to AT
 * (`role="menu"` + `menuitemradio`/`menuitemcheckbox` with `aria-checked`) and
 * supports roving Arrow/Home/End keyboard navigation per the WAI-ARIA menu
 * pattern — fixing the prior plain-button list that announced no selection state.
 */
function MenuList({
  ariaLabel,
  multiselect = false,
  options,
}: {
  ariaLabel: string;
  multiselect?: boolean;
  options: MenuOpt[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const role = multiselect ? 'menuitemcheckbox' : 'menuitemradio';
  // The selected option (or the first) is the single Tab stop into the menu.
  const tabbableIndex = Math.max(0, options.findIndex((o) => o.selected));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>(`[role="${role}"]`) ?? []);
    if (items.length === 0) return;
    e.preventDefault();
    const cur = items.findIndex((el) => el === document.activeElement);
    const last = items.length - 1;
    const next =
      e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : e.key === 'ArrowDown' ? (cur < 0 ? 0 : (cur + 1) % items.length)
      : cur < 0 ? last : (cur - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <div ref={ref} role="menu" aria-label={ariaLabel} onKeyDown={onKeyDown}>
      {options.map((o, i) => (
        <button
          key={o.key}
          type="button"
          role={role}
          aria-checked={o.selected}
          tabIndex={i === tabbableIndex ? 0 : -1}
          onClick={o.onSelect}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-content hover:bg-white/8 focus-visible:bg-white/8 focus-visible:outline-none"
        >
          {o.label}
          {o.selected ? <Check className="size-4 text-accent-bright" aria-hidden="true" /> : null}
        </button>
      ))}
    </div>
  );
}

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
        active ? 'bg-accent/15 text-accent-bright ring-accent/30' : 'bg-white/5 text-muted ring-line hover:bg-white/8',
        className
      )}
    >
      {label}
      {count ? <span className="rounded-full bg-accent/25 px-1.5 text-xs text-accent-bright">{count}</span> : null}
      <ChevronDown className="size-3.5 opacity-70" aria-hidden="true" />
    </button>
  );
});

/** The four segment filters from the live toolbar, wired to the Redux filter slice. */
export function SegmentFilters() {
  const dispatch = useAppDispatch();
  // Field-level selectors: this toolbar only depends on the four segment fields,
  // so it stays put when search/page/sort/letter change (Immer keeps each field's
  // reference stable), instead of re-rendering on every search keystroke.
  const groups = useAppSelector((s) => s.contactsUi.filters.groups);
  const beyondCircle = useAppSelector((s) => s.contactsUi.filters.beyondCircle);
  const emergency = useAppSelector((s) => s.contactsUi.filters.emergency);
  const relationship = useAppSelector((s) => s.contactsUi.filters.relationship);

  const toggleGroup = (g: string) => {
    const next = groups.includes(g) ? groups.filter((x) => x !== g) : [...groups, g];
    dispatch(setFilter({ key: 'groups', value: next }));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover trigger={<FilterPill label="Groups" active={groups.length > 0} count={groups.length} />}>
        <MenuList
          ariaLabel="Filter by group"
          multiselect
          options={GROUPS.map((g) => ({
            key: g,
            selected: groups.includes(g),
            onSelect: () => toggleGroup(g),
            label: (
              <span className="flex items-center gap-2">
                <Checkbox checked={groups.includes(g)} readOnly tabIndex={-1} aria-hidden="true" />
                {g}
              </span>
            ),
          }))}
        />
      </Popover>

      <Popover trigger={<FilterPill label="Beyond Circle" active={beyondCircle !== 'all'} />}>
        <MenuList
          ariaLabel="Filter by Beyond Circle"
          options={TRI_OPTIONS.map((o) => ({
            key: o.value,
            label: o.label,
            selected: beyondCircle === o.value,
            onSelect: () => dispatch(setFilter({ key: 'beyondCircle', value: o.value })),
          }))}
        />
      </Popover>

      <div className="flex items-center gap-1">
        <Popover trigger={<FilterPill label="Emergency" active={emergency !== 'all'} />}>
          <MenuList
            ariaLabel="Filter by emergency contact"
            options={TRI_OPTIONS.map((o) => ({
              key: o.value,
              label: o.label,
              selected: emergency === o.value,
              onSelect: () => dispatch(setFilter({ key: 'emergency', value: o.value })),
            }))}
          />
        </Popover>
        <InfoPopover
          label="Emergency contacts"
          title="Emergency"
          definition={ROLE_DEFINITIONS.emergency.definition}
          example={ROLE_DEFINITIONS.emergency.example}
        />
      </div>

      <Popover trigger={<FilterPill label="Relationships" active={!!relationship} />}>
        <MenuList
          ariaLabel="Filter by relationship"
          options={[
            {
              key: '__any__',
              label: 'Any',
              selected: !relationship,
              onSelect: () => dispatch(setFilter({ key: 'relationship', value: null })),
            },
            ...RELATIONSHIPS.map((r) => ({
              key: r,
              label: r,
              selected: relationship === r,
              onSelect: () => dispatch(setFilter({ key: 'relationship', value: r })),
            })),
          ]}
        />
      </Popover>
    </div>
  );
}
