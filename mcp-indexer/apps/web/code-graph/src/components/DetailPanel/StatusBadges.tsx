import type { NodeStatus } from '@repo/code-graph-core';
import { HEALTH_COLOR } from '../../lib/graph-style';

type StatusBadgesProps = { status: NodeStatus };

type Badge = { label: string; tone: 'ok' | 'warn' | 'error' | 'muted' };

const TONE_CLASS: Record<Badge['tone'], string> = {
  ok: 'bg-green-500/15 text-green-300',
  warn: 'bg-amber-500/15 text-amber-300',
  error: 'bg-red-500/15 text-red-300',
  muted: 'bg-zinc-700/30 text-zinc-400',
};

const buildBadges = (status: NodeStatus): Badge[] => {
  const badges: Badge[] = [];
  if (status.typeErrors > 0) {
    badges.push({ label: `${status.typeErrors} type errors`, tone: 'error' });
  } else if (status.buildOk === true) {
    badges.push({ label: 'Types ok', tone: 'ok' });
  } else {
    badges.push({ label: 'Not analyzed', tone: 'muted' });
  }
  if (status.lintWarnings > 0 || status.lintErrors > 0) {
    badges.push({
      label: `${status.lintErrors} lint err · ${status.lintWarnings} warn`,
      tone: status.lintErrors > 0 ? 'error' : 'warn',
    });
  }
  if (status.testsPass !== null) {
    badges.push({
      label: status.testsPass ? 'Tests pass' : 'Tests fail',
      tone: status.testsPass ? 'ok' : 'error',
    });
  }
  if (status.coveragePct !== null) {
    badges.push({
      label: `${Math.round(status.coveragePct)}% cov`,
      tone: status.coveragePct < 50 ? 'warn' : 'ok',
    });
  }
  return badges;
};

export const StatusBadges = ({
  status,
}: StatusBadgesProps): React.ReactElement => {
  const health = status.health;
  const badges = buildBadges(status);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: HEALTH_COLOR[health] }}
        />
        <span className="text-sm capitalize text-zinc-300">{health}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {badges.map((badge) => (
          <span
            key={badge.label}
            className={`rounded px-2 py-0.5 text-xs ${TONE_CLASS[badge.tone]}`}
          >
            {badge.label}
          </span>
        ))}
      </div>
    </div>
  );
};
