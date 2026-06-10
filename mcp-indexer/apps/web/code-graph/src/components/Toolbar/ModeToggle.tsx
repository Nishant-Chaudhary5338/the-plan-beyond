import type { ColorMode } from '../../store/graphStore';

type ModeToggleProps = {
  mode: ColorMode;
  onChange: (mode: ColorMode) => void;
};

const OPTIONS: { value: ColorMode; label: string }[] = [
  { value: 'type', label: 'Type' },
  { value: 'health', label: 'Health' },
];

export const ModeToggle = ({
  mode,
  onChange,
}: ModeToggleProps): React.ReactElement => (
  <div className="flex rounded-lg border border-white/[0.07] bg-white/[0.03] p-0.5 backdrop-blur-xl">
    {OPTIONS.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          mode === option.value
            ? 'bg-zinc-700/80 text-zinc-100'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);
