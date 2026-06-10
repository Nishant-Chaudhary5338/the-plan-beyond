import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { COUNTRIES, TOP_PICKS, DEFAULT_ISO2, DEFAULT_DIAL_CODE, type Country } from '@/lib/countries';
import { Popover } from './Popover';
import { Input } from './Input';

export interface PhoneValue {
  iso2: string;
  dialCode: string;
  number: string;
}

export const DEFAULT_PHONE_VALUE: PhoneValue = {
  iso2: DEFAULT_ISO2,
  dialCode: DEFAULT_DIAL_CODE,
  number: '',
};

export interface PhoneInputProps {
  value: PhoneValue;
  onChange: (value: PhoneValue) => void;
  invalid?: boolean;
  id?: string;
  'aria-describedby'?: string;
}

function CountryRow({ country, onSelect }: { country: Country; onSelect: (c: Country) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(country)}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-content hover:bg-white/8"
    >
      <span className="text-base">{country.flag}</span>
      <span className="flex-1 truncate">{country.name}</span>
      <span className="text-faint">{country.dialCode}</span>
    </button>
  );
}

/** Country-code picker + national number input (mirrors the Add Contact field). */
export function PhoneInput({ value, onChange, invalid, id, ...aria }: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.iso2.toLowerCase() === q
    ).slice(0, 8);
  }, [query]);

  const selectCountry = (c: Country) => {
    onChange({ iso2: c.iso2, dialCode: c.dialCode, number: value.number });
    setOpen(false);
    setQuery('');
  };

  return (
    <div
      className={cn(
        'flex h-12 items-stretch overflow-hidden rounded-[var(--radius-field)] bg-white/5 ring-1 ring-inset ring-line focus-within:ring-2 focus-within:ring-ring',
        invalid && 'ring-danger focus-within:ring-danger'
      )}
    >
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger={
          <button
            type="button"
            aria-label="Select country code"
            className="flex shrink-0 items-center gap-1.5 px-3 text-sm text-content hover:bg-white/5"
          >
            <span className="text-base">{COUNTRIES.find((c) => c.iso2 === value.iso2)?.flag ?? '🏳️'}</span>
            <span>{value.dialCode}</span>
            <ChevronDown className="size-3.5 text-faint" aria-hidden="true" />
          </button>
        }
      >
        <div className="w-64 p-1">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country or code…"
            className="mb-1 h-9"
            aria-label="Search countries"
          />
          <div className="scroll-themed max-h-64 overflow-y-auto">
            {query ? (
              matches.length ? (
                matches.map((c) => <CountryRow key={c.iso2} country={c} onSelect={selectCountry} />)
              ) : (
                <p className="px-3 py-2 text-sm text-faint">No matches</p>
              )
            ) : (
              <>
                <p className="px-3 py-1.5 text-xs uppercase tracking-wide text-faint">Top picks</p>
                {TOP_PICKS.map((c) => (
                  <CountryRow key={c.iso2} country={c} onSelect={selectCountry} />
                ))}
              </>
            )}
          </div>
        </div>
      </Popover>

      <input
        id={id}
        type="tel"
        inputMode="numeric"
        value={value.number}
        onChange={(e) => onChange({ ...value, number: e.target.value.replace(/[^\d]/g, '') })}
        placeholder="Phone number"
        aria-invalid={invalid || undefined}
        {...aria}
        className="w-full bg-transparent px-2 text-sm text-content placeholder:text-muted focus:outline-none"
      />
    </div>
  );
}
