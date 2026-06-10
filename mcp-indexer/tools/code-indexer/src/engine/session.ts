import type { Project } from 'ts-morph';
import type { GraphSnapshot, GraphNode, GraphEdge } from '@repo/code-graph-core';
import { appId, packageId } from '@repo/code-graph-core';
import type { IndexerConfig } from '../config.js';
import { createConfig } from '../config.js';
import {
  discoverWorkspace,
  type Workspace,
  type WorkspacePackage,
} from './discovery/discover-workspace.js';
import { indexMacro } from './structural/macro-nodes.js';
import { indexStructure } from './structural/micro-symbols.js';
import { runTypecheck } from './status/typecheck-runner.js';
import { mergePackageStatus } from './status/merge-status.js';

const INDEXER_VERSION = '0.1.0';

const buildSnapshot = (
  root: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
): GraphSnapshot => ({
  meta: {
    root,
    generatedAt: Date.now(),
    commit: null,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    indexerVersion: INDEXER_VERSION,
  },
  nodes,
  edges,
});

export class IndexerSession {
  readonly config: IndexerConfig;
  private workspace: Workspace | null = null;
  private project: Project | null = null;
  private snapshot: GraphSnapshot | null = null;

  constructor(root: string, overrides: Partial<IndexerConfig> = {}) {
    this.config = createConfig(root, overrides);
  }

  indexFull(): GraphSnapshot {
    const workspace = discoverWorkspace(this.config.root);
    const macro = indexMacro(workspace);
    const structural = indexStructure(this.config, workspace);

    this.workspace = workspace;
    this.project = structural.project;
    this.snapshot = buildSnapshot(
      workspace.root,
      [...macro.nodes, ...structural.nodes],
      [...macro.edges, ...structural.edges],
    );
    return this.snapshot;
  }

  getSnapshot(): GraphSnapshot | null {
    return this.snapshot;
  }

  getWorkspaceRoot(): string {
    return this.workspace?.root ?? this.config.root;
  }

  getProject(): Project | null {
    return this.project;
  }

  getPackages(): WorkspacePackage[] {
    return this.workspace?.packages ?? [];
  }

  ownerId(pkg: WorkspacePackage): string {
    return pkg.type === 'app' ? appId(pkg.name) : packageId(pkg.name);
  }

  findPackageForFile(relPath: string): WorkspacePackage | null {
    const matches = this.getPackages().filter((p) =>
      relPath.startsWith(`${p.relPath}/`),
    );
    return matches.sort((a, b) => b.relPath.length - a.relPath.length)[0] ?? null;
  }

  enrichPackageStatus(pkg: WorkspacePackage): GraphNode[] {
    if (!this.snapshot) return [];
    const fileStatus = runTypecheck(pkg.absPath, this.getWorkspaceRoot());
    return mergePackageStatus(
      this.snapshot,
      { ownerId: this.ownerId(pkg), relPath: pkg.relPath },
      fileStatus,
    );
  }

  enrichAllStatus(onPackage: (name: string, changed: GraphNode[]) => void): void {
    for (const pkg of this.getPackages()) {
      onPackage(pkg.name, this.enrichPackageStatus(pkg));
    }
  }
}
