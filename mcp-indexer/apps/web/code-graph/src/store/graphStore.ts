import { create } from 'zustand';
import type { GraphSnapshot, GraphPatch } from '@repo/code-graph-core';
import {
  buildIndex,
  rootId,
  type GraphIndex,
} from '../lib/graph-model';
import { blastRadius, findCycles } from '../lib/analysis';
import { fetchGraph, postKnowledge } from '../api/client';
import { connectWs } from '../api/ws';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
export type ColorMode = 'type' | 'health';

type GraphStore = {
  snapshot: GraphSnapshot | null;
  index: GraphIndex | null;
  focusId: string | null;
  selectedId: string | null;
  state: LoadState;
  error: string | null;
  statusVersion: number;
  knowledgeLoadingId: string | null;
  impactSet: Set<string> | null;
  cycleCount: number;
  colorMode: ColorMode;
  showOnboarding: boolean;
  fitSignal: number;
  load: () => Promise<void>;
  setColorMode: (mode: ColorMode) => void;
  dismissOnboarding: () => void;
  recenter: () => void;
  goHome: () => void;
  drillInto: (id: string) => void;
  drillTo: (id: string) => void;
  select: (id: string | null) => void;
  focusOn: (id: string) => void;
  applyPatch: (patch: GraphPatch) => void;
  generateKnowledge: (id: string) => Promise<void>;
  showImpact: (id: string) => void;
  clearImpact: () => void;
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
  cycleCount: 0,
  colorMode: 'type',
  showOnboarding:
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('cg-onboarded') !== '1',
  fitSignal: 0,

  setColorMode: (mode) => set({ colorMode: mode }),
  recenter: () => set((s) => ({ fitSignal: s.fitSignal + 1 })),
  goHome: () => {
    const root = get().snapshot ? rootId(get().snapshot!) : null;
    if (root) set({ focusId: root, selectedId: null, impactSet: null });
  },
  dismissOnboarding: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cg-onboarded', '1');
    }
    set({ showOnboarding: false });
  },

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

  drillInto: (id) => set({ focusId: id, selectedId: id, impactSet: null }),
  drillTo: (id) => set({ focusId: id, selectedId: null, impactSet: null }),
  select: (id) => set({ selectedId: id }),
  focusOn: (id) => {
    const node = get().index?.nodeById.get(id);
    set({ focusId: node?.parentId ?? get().focusId, selectedId: id });
  },
  showImpact: (id) => {
    const { index } = get();
    if (!index) return;
    set({ impactSet: blastRadius(index.crossEdges, id) });
  },
  clearImpact: () => set({ impactSet: null }),

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
    set((s) => ({ statusVersion: s.statusVersion + 1 }));
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
