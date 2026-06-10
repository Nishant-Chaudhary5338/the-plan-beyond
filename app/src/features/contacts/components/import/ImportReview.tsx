import { Avatar, Checkbox } from '@/components/ui';
import { formatPhoneDisplay } from '@/lib/phone';
import type { ParsedContact } from '../../utils/vcfParser';

interface ImportReviewProps {
  contacts: ParsedContact[];
  selected: Set<number>;
  onToggle: (index: number) => void;
  onToggleAll: (checked: boolean) => void;
}

/** Selectable preview of parsed contacts before import. */
export function ImportReview({ contacts, selected, onToggle, onToggleAll }: ImportReviewProps) {
  const allSelected = contacts.length > 0 && selected.size === contacts.length;

  return (
    <div>
      <label className="mb-2 flex items-center gap-2 px-1 text-sm text-muted">
        <Checkbox
          checked={allSelected}
          onChange={(e) => onToggleAll(e.target.checked)}
          aria-label="Select all contacts to import"
        />
        Select all ({selected.size}/{contacts.length})
      </label>
      <ul className="scroll-themed max-h-64 space-y-1 overflow-y-auto">
        {contacts.map((c, i) => (
          <li key={`${c.countryCode}${c.phone}`}>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
              <Checkbox
                checked={selected.has(i)}
                onChange={() => onToggle(i)}
                aria-label={`Import ${c.label}`}
              />
              <Avatar name={c.label} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-content">{c.label}</span>
                <span className="block text-xs text-faint">
                  {formatPhoneDisplay(`${c.countryCode}${c.phone}`)}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
