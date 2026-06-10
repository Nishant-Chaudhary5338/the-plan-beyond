import { Select } from '@/components/ui';
import { SORT_OPTIONS, type SortKey } from '../../model/filters';

interface SortMenuProps {
  value: SortKey;
  onChange: (sort: SortKey) => void;
}

/** Sort selector mirroring the live "Name A–Z" dropdown. */
export function SortMenu({ value, onChange }: SortMenuProps) {
  return (
    <div className="w-36 shrink-0">
      <Select
        value={value}
        onValueChange={(v) => onChange(v as SortKey)}
        options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        aria-label="Sort contacts"
        className="h-9 whitespace-nowrap px-3 text-xs"
      />
    </div>
  );
}
