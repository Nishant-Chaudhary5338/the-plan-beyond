import { useEffect } from 'react';
import { Boxes, RefreshCw, Loader2 } from 'lucide-react';
import { useGraphStore } from './store/graphStore';
import { pathToRoot } from './lib/graph-model';
import { blastRadius } from './lib/analysis';
import { GraphCanvas } from './components/Graph/GraphCanvas';
import { Breadcrumbs } from './components/DrillDown/Breadcrumbs';
import { DetailPanel } from './components/DetailPanel/DetailPanel';
import { Legend } from './components/Toolbar/Legend';
import { ModeToggle } from './components/Toolbar/ModeToggle';
import { ViewControls } from './components/Toolbar/ViewControls';
import { ChatPanel } from './components/Chat/ChatPanel';
import { OnboardingHint } from './components/Onboarding/OnboardingHint';

export const App = (): React.ReactElement => {
  const {
    index,
    snapshot,
    focusId,
    selectedId,
    statusVersion,
    knowledgeLoadingId,
    impactSet,
    cycleCount,
    colorMode,
    showOnboarding,
    state,
    error,
    load,
    drillInto,
    drillTo,
    select,
    focusOn,
    generateKnowledge,
    showImpact,
    clearImpact,
    setColorMode,
    dismissOnboarding,
    fitSignal,
    recenter,
    goHome,
  } = useGraphStore();

  useEffect(() => {
    void load();
  }, [load]);

  if (state === 'loading' || state === 'idle') {
    return (
      <Centered>
        <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        <p className="mt-3 text-sm text-zinc-300">Indexing your codebase…</p>
        <p className="mt-1 text-xs text-zinc-600">
          Parsing files, packages and dependencies
        </p>
      </Centered>
    );
  }
  if (state === 'error' || !index || !focusId) {
    return (
      <Centered>
        <span className="text-sm text-rose-400">
          {error ?? 'No graph available.'}
        </span>
        <span className="mt-2 text-xs text-zinc-500">
          Start the indexer:{' '}
          <code className="text-zinc-300">pnpm --filter indexer-server start</code>
        </span>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-lg bg-violet-500/20 px-3 py-1.5 text-xs font-medium text-violet-200 transition-colors hover:bg-violet-500/30"
        >
          Retry
        </button>
      </Centered>
    );
  }

  const breadcrumbPath = pathToRoot(index, focusId);
  const selectedNode = selectedId ? index.nodeById.get(selectedId) : undefined;
  const impactCount = selectedNode
    ? blastRadius(index.crossEdges, selectedNode.id).size
    : 0;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-white/[0.06] bg-[#0a0b12]/60 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Boxes className="h-5 w-5 text-violet-400" />
          <Breadcrumbs path={breadcrumbPath} onNavigate={drillTo} />
        </div>
        <div className="flex items-center gap-4">
          {cycleCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300/90">
              <RefreshCw className="h-3 w-3" />
              {cycleCount} cycles
            </span>
          )}
          <Legend mode={colorMode} />
          <ModeToggle mode={colorMode} onChange={setColorMode} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <GraphCanvas
            index={index}
            focusId={focusId}
            selectedId={selectedId}
            statusVersion={statusVersion}
            impactSet={impactSet}
            colorMode={colorMode}
            fitSignal={fitSignal}
            onDrill={drillInto}
            onSelect={select}
          />
          <div className="graph-vignette" />
          <ViewControls onHome={goHome} onRecenter={recenter} />
          {showOnboarding && (
            <OnboardingHint
              nodeCount={snapshot?.meta.nodeCount ?? 0}
              onDismiss={dismissOnboarding}
            />
          )}
          <ChatPanel onCite={focusOn} />
        </main>
        {selectedNode && (
          <DetailPanel
            node={selectedNode}
            childCount={index.childrenOf.get(selectedNode.id)?.length ?? 0}
            knowledgeLoading={knowledgeLoadingId === selectedNode.id}
            impactCount={impactCount}
            impactActive={impactSet !== null}
            onToggleImpact={() =>
              impactSet ? clearImpact() : showImpact(selectedNode.id)
            }
            onGenerateKnowledge={() => void generateKnowledge(selectedNode.id)}
            onClose={() => select(null)}
          />
        )}
      </div>
    </div>
  );
};

const Centered = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => (
  <div className="flex h-full flex-col items-center justify-center text-zinc-400">
    {children}
  </div>
);
