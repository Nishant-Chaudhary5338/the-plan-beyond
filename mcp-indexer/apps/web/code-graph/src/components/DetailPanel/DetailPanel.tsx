import { X } from 'lucide-react';
import type { GraphNode } from '@repo/code-graph-core';
import { hasMetrics, nodePath } from '@repo/code-graph-core';
import { TYPE_LABEL } from '../../lib/graph-model';
import { TYPE_COLOR, QUERY_COLOR } from '../../lib/graph-style';
import type { QueryKind } from '../../store/graphStore';
import { StatusBadges } from './StatusBadges';
import { KnowledgePanel } from './KnowledgePanel';
import { SourcePreview } from './SourcePreview';

export type QueryItem = { kind: QueryKind; label: string; count: number };

type DetailPanelProps = {
  node: GraphNode;
  childCount: number;
  knowledgeLoading: boolean;
  queries: QueryItem[];
  activeKind: QueryKind | null;
  onRunQuery: (kind: QueryKind) => void;
  onClearQuery: () => void;
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
  queries,
  activeKind,
  onRunQuery,
  onClearQuery,
  onGenerateKnowledge,
  onClose,
}: DetailPanelProps): React.ReactElement => {
  const answerable = queries.filter((q) => q.count > 0);
  return (
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
          aria-label="Close panel"
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

        {answerable.length > 0 && (
          <section className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Queries
            </h3>
            <div className="flex flex-col gap-1.5">
              {answerable.map((q) => {
                const active = activeKind === q.kind;
                return (
                  <button
                    key={q.kind}
                    type="button"
                    onClick={() => (active ? onClearQuery() : onRunQuery(q.kind))}
                    aria-pressed={active}
                    className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                      active
                        ? 'bg-accent/20 text-accent ring-1 ring-accent/40'
                        : 'bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: QUERY_COLOR[q.kind] ?? '#9DA2A9' }}
                      />
                      {q.label}
                    </span>
                    <span className="font-mono tabular-nums text-[11px] text-zinc-400">
                      {q.count}
                    </span>
                  </button>
                );
              })}
            </div>
            {activeKind && (
              <p className="mt-1.5 text-[11px] text-zinc-500">
                Highlighting matches on the graph — click again to clear.
              </p>
            )}
          </section>
        )}

        {KNOWLEDGE_TYPES.has(node.type) && (
          <section className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Source
            </h3>
            <SourcePreview nodeId={node.id} />
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
};
