import { IndexerSession } from 'code-indexer-mcp/engine';
import { writeSnapshot } from 'code-indexer-mcp/cache';
import { readNodeSource, describeNode } from 'code-indexer-mcp/knowledge';
import type {
  GraphSnapshot,
  GraphNode,
  GraphPatch,
  NodeKnowledge,
} from '@repo/code-graph-core';
import { askClaude } from './claude-cli.js';
import { summaryPrompt, chatPrompt } from './prompts.js';

export type ChatResult = { answer: string; citations: string[]; usedLlm: boolean };

const RETRIEVABLE = new Set(['file', 'component', 'function']);
const MAX_CONTEXT_NODES = 6;
const CONTEXT_CHARS = 1500;

export type PatchListener = (patch: GraphPatch) => void;

export class GraphService {
  private readonly session: IndexerSession;
  private snapshot: GraphSnapshot | null = null;
  private readonly listeners = new Set<PatchListener>();

  constructor(root: string) {
    this.session = new IndexerSession(root);
  }

  indexFull(): GraphSnapshot {
    const snapshot = this.session.indexFull();
    this.snapshot = snapshot;
    writeSnapshot(snapshot.meta.root, snapshot);
    return snapshot;
  }

  getSnapshot(): GraphSnapshot | null {
    return this.snapshot;
  }

  getNode(id: string): GraphNode | null {
    return this.snapshot?.nodes.find((n) => n.id === id) ?? null;
  }

  getSession(): IndexerSession {
    return this.session;
  }

  onPatch(listener: PatchListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emitPatch(patch: GraphPatch): void {
    for (const listener of this.listeners) listener(patch);
  }

  private upsertPatch(nodes: GraphNode[]): GraphPatch {
    return {
      upsertNodes: nodes,
      removeNodeIds: [],
      upsertEdges: [],
      removeEdgeIds: [],
      meta: {},
    };
  }

  async enrichStatusProgressive(): Promise<void> {
    for (const pkg of this.session.getPackages()) {
      const changed = this.session.enrichPackageStatus(pkg);
      if (changed.length > 0) this.emitPatch(this.upsertPatch(changed));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (this.snapshot) writeSnapshot(this.snapshot.meta.root, this.snapshot);
  }

  async generateKnowledge(nodeId: string): Promise<GraphNode | null> {
    const node = this.getNode(nodeId);
    if (!node) return null;
    const root = this.session.getWorkspaceRoot();
    const source = readNodeSource(root, node);

    const llm = source
      ? await askClaude(summaryPrompt(node, source), { model: 'haiku' })
      : null;
    const summary = llm ?? describeNode(node, source);

    const knowledge: NodeKnowledge = {
      summary,
      tags: [],
      embeddingId: null,
      generatedAt: Date.now(),
      model: llm ? 'claude (local cli)' : 'heuristic',
    };
    node.knowledge = knowledge;
    this.emitPatch(this.upsertPatch([node]));
    return node;
  }

  async askCodebase(question: string): Promise<ChatResult> {
    const snapshot = this.snapshot;
    if (!snapshot) return { answer: 'Graph not ready.', citations: [], usedLlm: false };

    const terms = question
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 2);
    const root = this.session.getWorkspaceRoot();

    const ranked = snapshot.nodes
      .filter((n) => RETRIEVABLE.has(n.type))
      .map((n) => {
        const name = n.name.toLowerCase();
        const filePath = (n.path ?? '').toLowerCase();
        const score = terms.reduce(
          (acc, t) =>
            acc + (name.includes(t) ? 2 : 0) + (filePath.includes(t) ? 1 : 0),
          0,
        );
        return { node: n, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CONTEXT_NODES);

    if (ranked.length === 0) {
      return { answer: 'No matching code found for that question.', citations: [], usedLlm: false };
    }

    const context = ranked.map(({ node }) => ({
      path: node.path ?? node.name,
      source: readNodeSource(root, node).slice(0, CONTEXT_CHARS),
    }));
    const citations = ranked.map(({ node }) => node.id);

    const llm = await askClaude(chatPrompt(question, context), {
      model: 'haiku',
      timeoutMs: 90000,
    });
    if (llm) return { answer: llm, citations, usedLlm: true };

    const fallback = ranked
      .map(({ node }) => `- ${node.path ?? node.name} (${node.type} ${node.name})`)
      .join('\n');
    return {
      answer: `Closest matches in the codebase:\n${fallback}`,
      citations,
      usedLlm: false,
    };
  }

  enrichFiles(relPaths: string[]): GraphNode[] {
    const packages = new Map<string, ReturnType<typeof this.session.findPackageForFile>>();
    for (const rel of relPaths) {
      const pkg = this.session.findPackageForFile(rel);
      if (pkg) packages.set(pkg.name, pkg);
    }
    const changed: GraphNode[] = [];
    for (const pkg of packages.values()) {
      if (pkg) changed.push(...this.session.enrichPackageStatus(pkg));
    }
    if (changed.length > 0) this.emitPatch(this.upsertPatch(changed));
    return changed;
  }
}
