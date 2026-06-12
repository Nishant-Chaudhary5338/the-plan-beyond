import { create } from 'zustand';
import type { GraphSnapshot, GraphPatch, NodeType } from '@repo/code-graph-core';
import {
  buildIndex,
  rootId,
  type GraphIndex,
} from '../lib/graph-model';
import {
  blastRadius,
  findCycles,
  whoRenders,
  whoCalls,
  findReferences,
} from '../lib/analysis';
import { fetchGraph, postKnowledge } from '../api/client';
import { connectWs } from '../api/ws';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
export type ColorMode = 'type' | 'health';
export type RenderMode = '2d' | '3d';
/** A reverse-graph question, surfaced from the detail panel and painted on the graph. */
export type QueryKind = 'renders' | 'calls' | 'references' | 'blast-radius';

type GraphStore = {
  snapshot: GraphSnapshot | null;
  index: GraphIndex | null;
  focusId: string | null;
  selectedId: string | null;
  state: LoadState;
  error: string | null;
  statusVersion: number;
  knowledgeLoadingId: string | null;
  /** Highlighted node ids for the active reverse-query (and which query it is). */
  impactSet: Set<string> | null;
  highlightKind: QueryKind | null;
  cycleCount: number;
  colorMode: ColorMode;
  renderMode: RenderMode;
  /** Node types hidden via the filter rail. */
  hiddenTypes: Set<NodeType>;
  /** Edge types hidden via the filter rail. */
  hiddenEdges: Set<string>;
  railCollapsed: boolean;
  showOnboarding: boolean;
  /** Wall-clock of the last applied live patch, for the "updated Xs ago" pill. */
  lastUpdatedAt: number | null;
  fitSignal: number;
  load: () => Promise<void>;
  setColorMode: (mode: ColorMode) => void;
  setRenderMode: (mode: RenderMode) => void;
  toggleType: (t: NodeType) => void;
  toggleEdge: (e: string) => void;
  toggleRail: () => void;
  dismissOnboarding: () => void;
  openOnboarding: () => void;
  recenter: () => void;
  goHome: () => void;
  drillInto: (id: string) => void;
  drillTo: (id: string) => void;
  select: (id: string | null) => void;
  focusOn: (id: string) => void;
  applyPatch: (patch: GraphPatch) => void;
  generateKnowledge: (id: string) => Promise<void>;
  /** Run a reverse-query for a node and paint the matching nodes. */
  runQuery: (kind: QueryKind, id: string) => void;
  clearQuery: () => void;
};

/** Resolve a reverse-query to the set of node ids it matches. */
const queryResultIds = (
  kind: QueryKind,
  edges: GraphSnapshot['edges'],
  id: string,
): Set<string> => {
  switch (kind) {
    case 'blast-radius':
      return blastRadius(edges, id);
    case 'renders':
      return new Set(whoRenders(edges, id).map((e) => e.source));
    case 'calls':
      return new Set(whoCalls(edges, id).map((e) => e.source));
    case 'references':
      return new Set(findReferences(edges, id).map((e) => e.source));
  }
};

export const useGraphStore = create<GraphStore>((set, get) => ({
  snapshot: null,
  index: null,
  focusId: null,
  selectedId: null,
  state: 'idle',
  error: null,
  statusVersion: 0,
  knowledgeLoadingId: null,
  impactSet: null,
  highlightKind: null,
  cycleCount: 0,
  colorMode: 'type',
  renderMode: '3d',
  hiddenTypes: new Set(),
  hiddenEdges: new Set(),
  railCollapsed: false,
  showOnboarding:
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('cg-onboarded') !== '1',
  lastUpdatedAt: null,
  fitSignal: 0,

  setColorMode: (mode) => set({ colorMode: mode }),
  setRenderMode: (mode) => set({ renderMode: mode }),
  toggleType: (t) =>
    set((s) => {
      const next = new Set(s.hiddenTypes);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return { hiddenTypes: next };
    }),
  toggleEdge: (e) =>
    set((s) => {
      const next = new Set(s.hiddenEdges);
      if (next.has(e)) next.delete(e);
      else next.add(e);
      return { hiddenEdges: next };
    }),
  toggleRail: () => set((s) => ({ railCollapsed: !s.railCollapsed })),
  recenter: () => set((s) => ({ fitSignal: s.fitSignal + 1 })),
  goHome: () => {
    const root = get().snapshot ? rootId(get().snapshot!) : null;
    if (root) set({ focusId: root, selectedId: null, impactSet: null, highlightKind: null });
  },
  dismissOnboarding: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cg-onboarded', '1');
    }
    set({ showOnboarding: false });
  },
  // Re-open the first-run tips on demand (the `?` affordance) without clearing
  // the persisted "seen" flag — dismissing again simply hides them.
  openOnboarding: () => set({ showOnboarding: true }),

  load: async () => {
    set({ state: 'loading', error: null });
    try {
      const snapshot = await fetchGraph();
      const index = buildIndex(snapshot);
      // Standalone repos have a single app under the root — open it directly.
      const root = rootId(snapshot);
      const rootChildren = root ? index.childrenOf.get(root) ?? [] : [];
      const focusId =
        rootChildren.length === 1 ? rootChildren[0]!.id : root;
      set({
        snapshot,
        index,
        focusId,
        selectedId: null,
        state: 'ready',
        cycleCount: findCycles(index.crossEdges).length,
      });
      connectWs({ onPatch: get().applyPatch });
    } catch (err) {
      set({
        state: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  drillInto: (id) =>
    set({ focusId: id, selectedId: id, impactSet: null, highlightKind: null }),
  drillTo: (id) =>
    set({ focusId: id, selectedId: null, impactSet: null, highlightKind: null }),
  select: (id) => set({ selectedId: id }),
  focusOn: (id) => {
    const node = get().index?.nodeById.get(id);
    set({ focusId: node?.parentId ?? get().focusId, selectedId: id });
  },
  runQuery: (kind, id) => {
    const { index } = get();
    if (!index) return;
    set({
      impactSet: queryResultIds(kind, index.crossEdges, id),
      highlightKind: kind,
    });
  },
  clearQuery: () => set({ impactSet: null, highlightKind: null }),

  applyPatch: (patch) => {
    const { index } = get();
    if (!index) return;
    if (import.meta.env.DEV) {
      (window as unknown as { __lastPatch?: number }).__lastPatch = Date.now();
    }
    // Status-only patches: mutate existing node objects in place so positions
    // (and the running force sim) are untouched — only colors refresh.
    for (const node of patch.upsertNodes) {
      const existing = index.nodeById.get(node.id);
      if (existing) {
        existing.status = node.status;
        existing.knowledge = node.knowledge;
      }
    }
    set((s) => ({ statusVersion: s.statusVersion + 1, lastUpdatedAt: Date.now() }));
  },

  generateKnowledge: async (id) => {
    set({ knowledgeLoadingId: id });
    try {
      const knowledge = await postKnowledge(id);
      const { index } = get();
      const node = index?.nodeById.get(id);
      if (node && knowledge) node.knowledge = knowledge;
    } finally {
      set((s) => ({
        knowledgeLoadingId: null,
        statusVersion: s.statusVersion + 1,
      }));
    }
  },
}));

if (import.meta.env.DEV) {
  (window as unknown as { __graphStore?: typeof useGraphStore }).__graphStore =
    useGraphStore;
}
