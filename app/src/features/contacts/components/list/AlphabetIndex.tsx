import { cn } from '@/lib/cn';
import { ALPHABET } from '../../utils/alphabet';
import type { LetterFilter } from '../../model/filters';

interface AlphabetIndexProps {
  value: LetterFilter;
  onChange: (letter: LetterFilter) => void;
}

function chipClass(active: boolean): string {
  return cn(
    'grid size-6 shrink-0 place-items-center rounded-md text-xs font-medium transition-colors',
    'hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    active ? 'bg-white/12 text-content' : 'text-faint'
  );
}

/** A–Z quick filter. "All" clears the letter constraint. Stays on one row from lg up. */
export function AlphabetIndex({ value, onChange }: AlphabetIndexProps) {
  return (
    <div
      role="group"
      aria-label="Filter by first letter"
      className="flex flex-wrap items-center gap-0.5"
    >
      <button
        type="button"
        aria-pressed={value === 'all'}
        onClick={() => onChange('all')}
        className={cn(chipClass(value === 'all'), 'w-auto px-1.5')}
      >
        All
      </button>
      {ALPHABET.map((letter) => (
        <button
          key={letter}
          type="button"
          aria-pressed={value === letter}
          onClick={() => onChange(value === letter ? 'all' : letter)}
          className={chipClass(value === letter)}
        >
          {letter}
        </button>
      ))}
    </div>
  );
}
