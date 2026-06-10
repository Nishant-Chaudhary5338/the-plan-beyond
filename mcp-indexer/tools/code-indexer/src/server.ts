import * as path from 'path';
import { McpServerBase } from '../../_shared/index.js';
import type { ToolResult } from '../../_shared/index.js';
import { createConfig } from './config.js';
import { runFullIndex } from './engine/index.js';
import { writeSnapshot, readSnapshot } from './engine/incremental/cache.js';

type IndexArgs = { root?: string };
type NodeArgs = { root?: string; id?: string };

const resolveRoot = (root?: string): string =>
  root ? path.resolve(root) : process.cwd();

export class CodeIndexerServer extends McpServerBase {
  constructor() {
    super({ name: 'code-indexer', version: '0.1.0' });
  }

  protected registerTools(): void {
    this.addTool(
      'index_repo',
      'Index a TS/React monorepo into a code graph and persist it to .code-graph/graph.json',
      {
        type: 'object',
        properties: {
          root: { type: 'string', description: 'Repo root (defaults to cwd)' },
        },
      },
      this.handleIndexRepo.bind(this),
    );

    this.addTool(
      'get_graph',
      'Read the persisted code graph snapshot for a repo',
      {
        type: 'object',
        properties: {
          root: { type: 'string', description: 'Repo root (defaults to cwd)' },
        },
      },
      this.handleGetGraph.bind(this),
    );

    this.addTool(
      'get_node',
      'Read a single node from the persisted code graph by id',
      {
        type: 'object',
        properties: {
          root: { type: 'string' },
          id: { type: 'string', description: 'Canonical node id' },
        },
        required: ['id'],
      },
      this.handleGetNode.bind(this),
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
    const root = resolveRoot((args as IndexArgs).root);
    const snapshot = readSnapshot(root);
    if (!snapshot) return this.error(new Error('No graph found. Run index_repo first.'));
    return this.success({ meta: snapshot.meta, nodes: snapshot.nodes, edges: snapshot.edges });
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
}
