import * as path from 'path';
import { FileSystemRefreshResult, type Project, type SourceFile } from 'ts-morph';
import type {
  GraphSnapshot,
  GraphNode,
  GraphEdge,
  GraphPatch,
} from '@repo/code-graph-core';
import { appId, packageId, fileId } from '@repo/code-graph-core';
import type { IndexerConfig } from '../config.js';
import { createConfig } from '../config.js';
import {
  discoverWorkspace,
  type Workspace,
  type WorkspacePackage,
} from './discovery/discover-workspace.js';
import { indexMacro } from './structural/macro-nodes.js';
import {
  indexStructure,
  extractFile,
  buildReusableSubgraph,
  type ReusableSubgraph,
} from './structural/micro-symbols.js';
import { runTypecheck } from './status/typecheck-runner.js';
import { mergePackageStatus } from './status/merge-status.js';
import { readHashIndex, deriveHashIndex } from './incremental/cache.js';

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
  /** One ts-morph project per package (kept live for reparse). */
  private projects = new Map<string, Project>();
  private fileToProject = new Map<string, Project>();
  private fileToPackage = new Map<string, WorkspacePackage>();
  private snapshot: GraphSnapshot | null = null;

  constructor(root: string, overrides: Partial<IndexerConfig> = {}) {
    this.config = createConfig(root, overrides);
  }

  /**
   * Load a previously-persisted snapshot into the session without rebuilding
   * the ts-morph projects. Used to seed an incremental reindex from disk.
   */
  hydrate(snapshot: GraphSnapshot): void {
    this.snapshot = snapshot;
  }

  /** Full, from-scratch index. */
  indexFull(): GraphSnapshot {
    return this.runIndex(null);
  }

  /**
   * Incremental reindex. Reuses the persisted graph + hash sidecar so unchanged
   * files are spliced back in verbatim (no re-parse), changed/new files are
   * re-extracted, and files that disappeared are dropped. Falls back to a full
   * index when no prior cache exists.
   */
  reindexIncremental(): GraphSnapshot {
    const root = this.config.root;
    const hashes = readHashIndex(root);
    const previous = this.snapshot;
    if (!previous || !hashes) return this.indexFull();
    const prior = buildReusableSubgraph(previous, hashes);
    return this.runIndex(prior);
  }

  private runIndex(prior: ReusableSubgraph | null): GraphSnapshot {
    const workspace = discoverWorkspace(this.config.root);
    const macro = indexMacro(workspace);
    const structural = indexStructure(this.config, workspace, prior);

    this.workspace = workspace;
    this.projects = structural.projects;
    this.fileToProject = structural.fileToProject;
    this.fileToPackage = structural.fileToPackage;
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

  /** The ts-morph project that owns a given relPath, if indexed. */
  getProjectForFile(relPath: string): Project | null {
    return this.fileToProject.get(relPath) ?? null;
  }

  getPackages(): WorkspacePackage[] {
    return this.workspace?.packages ?? [];
  }

  ownerId(pkg: WorkspacePackage): string {
    return pkg.type === 'app' ? appId(pkg.name) : packageId(pkg.name);
  }

  findPackageForFile(relPath: string): WorkspacePackage | null {
    const matches = this.getPackages().filter(
      (p) => p.relPath === '' || relPath.startsWith(`${p.relPath}/`),
    );
    // Most specific (longest relPath) package wins.
    return matches.sort((a, b) => b.relPath.length - a.relPath.length)[0] ?? null;
  }

  /**
   * Re-parse the given source files against fresh disk content and rebuild
   * their structural nodes/edges, returning a {@link GraphPatch} describing the
   * delta. This is the method the server's watcher calls on a save so the
   * *structural* graph (spans, symbols, imports) stays in sync with disk — not
   * just the typecheck status.
   *
   * Behavior:
   *  - Refreshes each file in its live ts-morph project (or adds it if new).
   *  - Removes all prior nodes/edges for each touched file, then re-extracts.
   *  - If a file no longer exists on disk, its nodes/edges are removed and no
   *    replacements are emitted.
   *  - Folder/macro nodes are left intact (folder chains only grow).
   *  - The session's in-memory snapshot is updated in place so subsequent reads
   *    and patches are consistent.
   *
   * @param absPaths Absolute paths of the saved/created/deleted source files.
   * @returns A GraphPatch (upsert/remove node+edge ids) describing the delta.
   */
  reparseFiles(absPaths: string[]): GraphPatch {
    const snapshot = this.snapshot;
    const workspaceRoot = this.getWorkspaceRoot();
    const patch: GraphPatch = {
      upsertNodes: [],
      removeNodeIds: [],
      upsertEdges: [],
      removeEdgeIds: [],
      meta: {},
    };
    if (!snapshot) return patch;

    const folders = new Map<string, GraphNode>();
    const folderEdges: GraphEdge[] = [];

    for (const abs of absPaths) {
      const rel = path.relative(workspaceRoot, abs);
      if (rel.startsWith('..')) continue;

      const pkg =
        this.fileToPackage.get(rel) ?? this.findPackageForFile(rel) ?? null;
      const project =
        this.fileToProject.get(rel) ??
        (pkg ? this.projects.get(pkg.name) ?? null : null);

      // Remove everything currently attributed to this file.
      const removed = this.removeFileFromSnapshot(rel);
      patch.removeNodeIds.push(...removed.nodeIds);
      patch.removeEdgeIds.push(...removed.edgeIds);

      if (!project || !pkg) continue;

      const source = this.refreshSource(project, abs);
      if (!source) {
        // File deleted on disk — removal already recorded above.
        this.fileToProject.delete(rel);
        this.fileToPackage.delete(rel);
        continue;
      }

      try {
        const result = extractFile(
          source,
          rel,
          pkg,
          workspaceRoot,
          folders,
          folderEdges,
        );
        // Apply to the in-memory snapshot.
        snapshot.nodes.push(...result.nodes);
        snapshot.edges.push(...result.edges);
        patch.upsertNodes.push(...result.nodes);
        patch.upsertEdges.push(...result.edges);
        this.fileToProject.set(rel, project);
        this.fileToPackage.set(rel, pkg);
      } catch (err) {
        console.warn(
          `[code-indexer] reparse skipped ${rel}: ${(err as Error).message}`,
        );
      }
    }

    // Splice any newly-created folder nodes/edges into the snapshot + patch.
    for (const folder of folders.values()) {
      if (!snapshot.nodes.some((n) => n.id === folder.id)) {
        snapshot.nodes.push(folder);
        patch.upsertNodes.push(folder);
      }
    }
    for (const edge of folderEdges) {
      if (!snapshot.edges.some((e) => e.id === edge.id)) {
        snapshot.edges.push(edge);
        patch.upsertEdges.push(edge);
      }
    }

    snapshot.meta.nodeCount = snapshot.nodes.length;
    snapshot.meta.edgeCount = snapshot.edges.length;
    snapshot.meta.generatedAt = Date.now();
    patch.meta = {
      nodeCount: snapshot.meta.nodeCount,
      edgeCount: snapshot.meta.edgeCount,
      generatedAt: snapshot.meta.generatedAt,
    };
    return patch;
  }

  // Refresh a file from disk into the live project; returns null if it was
  // deleted. Adds the file if it wasn't part of the project yet (new file).
  private refreshSource(project: Project, abs: string): SourceFile | null {
    const existing = project.getSourceFile(abs);
    if (existing) {
      const result = existing.refreshFromFileSystemSync();
      // FileSystemRefreshResult.Deleted === 2
      if (result === FileSystemRefreshResult.Deleted) return null;
      return existing.wasForgotten() ? null : existing;
    }
    return project.addSourceFileAtPathIfExists(abs) ?? null;
  }

  // Remove a file node, its symbol children, and any edges touching them from
  // the in-memory snapshot. Returns the removed ids for the patch.
  private removeFileFromSnapshot(rel: string): {
    nodeIds: string[];
    edgeIds: string[];
  } {
    const snapshot = this.snapshot;
    if (!snapshot) return { nodeIds: [], edgeIds: [] };

    const fileNodeId = fileId(rel);
    const removeNodeIds = new Set<string>();
    for (const node of snapshot.nodes) {
      if (node.id === fileNodeId || node.parentId === fileNodeId) {
        removeNodeIds.add(node.id);
      }
    }
    const removeEdgeIds = new Set<string>();
    snapshot.edges = snapshot.edges.filter((e) => {
      if (removeNodeIds.has(e.source) || removeNodeIds.has(e.target)) {
        removeEdgeIds.add(e.id);
        return false;
      }
      return true;
    });
    snapshot.nodes = snapshot.nodes.filter((n) => !removeNodeIds.has(n.id));

    return { nodeIds: [...removeNodeIds], edgeIds: [...removeEdgeIds] };
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

  /** The current per-file content-hash index for the live snapshot. */
  currentHashIndex(): Record<string, string> {
    return this.snapshot ? deriveHashIndex(this.snapshot) : {};
  }
}
