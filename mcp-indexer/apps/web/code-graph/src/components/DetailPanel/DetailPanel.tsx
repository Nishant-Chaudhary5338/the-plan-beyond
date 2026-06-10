import { X, Zap } from 'lucide-react';
import type { GraphNode } from '@repo/code-graph-core';
import { hasMetrics, nodePath } from '@repo/code-graph-core';
import { TYPE_LABEL } from '../../lib/graph-model';
import { TYPE_COLOR } from '../../lib/graph-style';
import { StatusBadges } from './StatusBadges';
import { KnowledgePanel } from './KnowledgePanel';

type DetailPanelProps = {
  node: GraphNode;
  childCount: number;
  knowledgeLoading: boolean;
  impactCount: number;
  impactActive: boolean;
  onToggleImpact: () => void;
  onGenerateKnowledge: () => void;
  onClose: () => void;
};

const KNOWLEDGE_TYPES = new Set(['file', 'component', 'function']);

const Row = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): React.ReactElement => (
  <div className="flex justify-between gap-4 py-1 text-sm">
    <span className="text-zinc-400">{label}</span>
    <span
      className={`truncate text-right text-zinc-200${mono ? ' font-mono text-[13px]' : ''}`}
    >
      {value}
    </span>
  </div>
);

export const DetailPanel = ({
  node,
  childCount,
  knowledgeLoading,
  impactCount,
  impactActive,
  onToggleImpact,
  onGenerateKnowledge,
  onClose,
}: DetailPanelProps): React.ReactElement => (
  <aside className="animate-panel flex h-full w-80 flex-col border-l border-white/[0.07] bg-[#0a0b12]/70 shadow-[inset_1px_0_0_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
    <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: TYPE_COLOR[node.type] }}
        />
        <h2 className="truncate font-mono text-sm font-semibold text-zinc-100">
          {node.name}
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-zinc-500 transition-colors hover:text-zinc-200"
      >
        <X className="h-4 w-4" />
      </button>
    </header>

    <div className="flex-1 overflow-y-auto px-4 py-3">
      <section className="mb-4">
        <Row label="Type" value={TYPE_LABEL[node.type]} />
        {nodePath(node) && <Row label="Path" value={nodePath(node)!} mono />}
        {hasMetrics(node) && <Row label="Lines" value={String(node.metrics.loc)} />}
        {childCount > 0 && <Row label="Children" value={String(childCount)} />}
        {hasMetrics(node) && node.metrics.exportsCount > 0 && (
          <Row label="Exports" value={String(node.metrics.exportsCount)} />
        )}
      </section>

      <section className="mb-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Status
        </h3>
        <StatusBadges status={node.status} />
      </section>

      {impactCount > 0 && (
        <section className="mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Impact
          </h3>
          <button
            type="button"
            onClick={onToggleImpact}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors ${
              impactActive
                ? 'bg-fuchsia-500/25 text-fuchsia-100'
                : 'bg-fuchsia-500/15 text-fuchsia-300 hover:bg-fuchsia-500/25'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            {impactActive
              ? 'Hide blast radius'
              : `Show blast radius (${impactCount} dependents)`}
          </button>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Knowledge
        </h3>
        <KnowledgePanel
          knowledge={node.knowledge}
          loading={knowledgeLoading}
          canGenerate={KNOWLEDGE_TYPES.has(node.type)}
          onGenerate={onGenerateKnowledge}
        />
      </section>
    </div>
  </aside>
);
