import * as path from 'path';
import { McpServerBase } from '../../_shared/index.js';
import type { ToolResult } from '../../_shared/index.js';
import { createConfig } from './config.js';
import { runFullIndex } from './engine/index.js';
import { writeSnapshot } from './engine/incremental/cache.js';
import {
  queryWhoRenders,
  queryWhoCalls,
  queryFindReferences,
  queryBlastRadius,
  queryFindCycles,
  queryGraph,
  type GraphQueryOptions,
} from './query.js';
import { readSnapshot } from './engine/incremental/cache.js';

type IndexArgs = { root?: string };
type NodeArgs = { root?: string; id?: string };
type RefArgs = { root?: string; id?: string; types?: string[] };
type GraphArgs = {
  root?: string;
  summary?: boolean;
  full?: boolean;
  lean?: boolean;
  depth?: number;
  type?: string[];
  fields?: string[];
};

const resolveRoot = (root?: string): string =>
  root ? path.resolve(root) : process.cwd();

const rootProp = {
  root: { type: 'string', description: 'Repo root (defaults to cwd)' },
} as const;

export class CodeIndexerServer extends McpServerBase {
  constructor() {
    super({ name: 'code-indexer', version: '0.1.0' });
  }

  protected registerTools(): void {
    this.addTool(
      'index_repo',
      'Index a TS/React repo (monorepo or standalone) into a code graph and persist it to .code-graph/graph.json',
      { type: 'object', properties: { ...rootProp } },
      this.handleIndexRepo.bind(this),
    );

    this.addTool(
      'get_graph',
      'Read the code graph. Defaults to a compact summary on large repos (pass full:true for everything). Narrow with type/depth/lean/fields to keep output small.',
      {
        type: 'object',
        properties: {
          ...rootProp,
          summary: { type: 'boolean', description: 'Return only counts + top-level structure + cycle count' },
          full: { type: 'boolean', description: 'Force the entire graph even when large' },
          lean: { type: 'boolean', description: 'Drop status/knowledge/git/span from nodes' },
          depth: { type: 'number', description: 'Keep only N levels from the repo root (contains tree)' },
          type: { type: 'array', items: { type: 'string' }, description: 'Keep only nodes of these types (e.g. component, function)' },
          fields: { type: 'array', items: { type: 'string' }, description: 'Whitelist of node fields to return' },
        },
      },
      this.handleGetGraph.bind(this),
    );

    this.addTool(
      'get_node',
      'Read a single node from the persisted code graph by id',
      {
        type: 'object',
        properties: { ...rootProp, id: { type: 'string', description: 'Canonical node id' } },
        required: ['id'],
      },
      this.handleGetNode.bind(this),
    );

    this.addTool(
      'who_renders',
      'Reverse lookup: which components render the given component id (incoming renders edges)',
      {
        type: 'object',
        properties: { ...rootProp, id: { type: 'string', description: 'Component node id (e.g. cmp:src/Foo.tsx#Foo)' } },
        required: ['id'],
      },
      this.handleWhoRenders.bind(this),
    );

    this.addTool(
      'who_calls',
      'Reverse lookup: which symbols call the given function/component id (incoming calls edges)',
      {
        type: 'object',
        properties: { ...rootProp, id: { type: 'string', description: 'Symbol node id (e.g. fn:src/util.ts#helper)' } },
        required: ['id'],
      },
      this.handleWhoCalls.bind(this),
    );

    this.addTool(
      'find_references',
      'All references into a node (incoming edges), optionally filtered by edge type',
      {
        type: 'object',
        properties: {
          ...rootProp,
          id: { type: 'string', description: 'Target node id' },
          types: { type: 'array', items: { type: 'string' }, description: 'Edge types to include (renders, calls, imports, references, depends-on)' },
        },
        required: ['id'],
      },
      this.handleFindReferences.bind(this),
    );

    this.addTool(
      'blast_radius',
      'Everything that transitively depends on a node — the impact if it changes or breaks',
      {
        type: 'object',
        properties: { ...rootProp, id: { type: 'string', description: 'Target node id' } },
        required: ['id'],
      },
      this.handleBlastRadius.bind(this),
    );

    this.addTool(
      'find_cycles',
      'Find dependency cycles in the graph (import/render/call cycles)',
      { type: 'object', properties: { ...rootProp } },
      this.handleFindCycles.bind(this),
    );
  }

  private async handleIndexRepo(args: unknown): Promise<ToolResult> {
    const root = resolveRoot((args as IndexArgs).root);
    const { snapshot, durationMs } = runFullIndex(createConfig(root));
    writeSnapshot(snapshot.meta.root, snapshot);
    return this.success({
      root: snapshot.meta.root,
      nodeCount: snapshot.meta.nodeCount,
      edgeCount: snapshot.meta.edgeCount,
      durationMs,
    });
  }

  private async handleGetGraph(args: unknown): Promise<ToolResult> {
    const a = args as GraphArgs;
    const opts: GraphQueryOptions = {
      summary: a.summary,
      full: a.full,
      lean: a.lean,
      depth: a.depth,
      type: a.type as GraphQueryOptions['type'],
      fields: a.fields,
    };
    try {
      return this.success({ graph: queryGraph(resolveRoot(a.root), opts) });
    } catch (err) {
      return this.error(err);
    }
  }

  private async handleGetNode(args: unknown): Promise<ToolResult> {
    const { root, id } = args as NodeArgs;
    if (!id) return this.error(new Error('id is required'));
    const snapshot = readSnapshot(resolveRoot(root));
    if (!snapshot) return this.error(new Error('No graph found. Run index_repo first.'));
    const node = snapshot.nodes.find((n) => n.id === id);
    if (!node) return this.error(new Error(`Node not found: ${id}`));
    return this.success({ node });
  }

  private requireId(args: unknown): { root?: string; id: string } {
    const { root, id } = args as NodeArgs;
    if (!id) throw new Error('id is required');
    return { root, id };
  }

  private async handleWhoRenders(args: unknown): Promise<ToolResult> {
    try {
      const { root, id } = this.requireId(args);
      return this.success({ ...queryWhoRenders(resolveRoot(root), id) });
    } catch (err) {
      return this.error(err);
    }
  }

  private async handleWhoCalls(args: unknown): Promise<ToolResult> {
    try {
      const { root, id } = this.requireId(args);
      return this.success({ ...queryWhoCalls(resolveRoot(root), id) });
    } catch (err) {
      return this.error(err);
    }
  }

  private async handleFindReferences(args: unknown): Promise<ToolResult> {
    try {
      const { root, id, types } = args as RefArgs;
      if (!id) throw new Error('id is required');
      return this.success({ ...queryFindReferences(resolveRoot(root), id, types) });
    } catch (err) {
      return this.error(err);
    }
  }

  private async handleBlastRadius(args: unknown): Promise<ToolResult> {
    try {
      const { root, id } = this.requireId(args);
      return this.success({ ...queryBlastRadius(resolveRoot(root), id) });
    } catch (err) {
      return this.error(err);
    }
  }

  private async handleFindCycles(args: unknown): Promise<ToolResult> {
    try {
      const root = resolveRoot((args as IndexArgs).root);
      return this.success({ ...queryFindCycles(root) });
    } catch (err) {
      return this.error(err);
    }
  }
}
