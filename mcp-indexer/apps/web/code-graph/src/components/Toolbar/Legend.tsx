import type { NodeType, HealthLevel } from '@repo/code-graph-core';
import type { ColorMode } from '../../store/graphStore';
import { TYPE_COLOR, HEALTH_COLOR } from '../../lib/graph-style';
import { TYPE_LABEL } from '../../lib/graph-model';

type LegendProps = { mode: ColorMode };

const TYPE_ORDER: NodeType[] = [
  'app',
  'package',
  'folder',
  'file',
  'component',
  'function',
];
const HEALTH_ITEMS: { level: HealthLevel; label: string }[] = [
  { level: 'ok', label: 'Healthy' },
  { level: 'warn', label: 'Warnings' },
  { level: 'error', label: 'Type errors' },
  { level: 'unknown', label: 'Not analyzed' },
];

const Swatch = ({
  color,
  label,
}: {
  color: string;
  label: string;
}): React.ReactElement => (
  <span className="flex items-center gap-1.5">
    <span
      className="h-2 w-2 rounded-full"
      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
    />
    {label}
  </span>
);

export const Legend = ({ mode }: LegendProps): React.ReactElement => (
  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
    {mode === 'type'
      ? TYPE_ORDER.map((type) => (
          <Swatch key={type} color={TYPE_COLOR[type]} label={TYPE_LABEL[type]} />
        ))
      : HEALTH_ITEMS.map((item) => (
          <Swatch
            key={item.level}
            color={HEALTH_COLOR[item.level]}
            label={item.label}
          />
        ))}
  </div>
);
