import * as fs from 'fs';
import * as path from 'path';
import { Project, ts, type SourceFile } from 'ts-morph';
import type { GraphNode, GraphEdge, FileNode } from '@repo/code-graph-core';
import { fileId, edgeId, emptyStatus } from '@repo/code-graph-core';
import { packageId, appId } from '@repo/code-graph-core';
import { hashContent } from '../../../../_shared/index.js';
import type { IndexerConfig } from '../../config.js';
import { isSourceFile } from '../../config.js';
import type {
  Workspace,
  WorkspacePackage,
} from '../discovery/discover-workspace.js';
import { extractSymbolNodes } from './symbol-nodes.js';
import { extractImportEdges } from './import-edges.js';
import { ensureFolderChain } from './folder-tree.js';

export type StructuralResult = {
  /** One ts-morph Project per package, keyed by package name. */
  projects: Map<string, Project>;
  /** relPath -> the Project that owns that source file (for live reparse). */
  fileToProject: Map<string, Project>;
  /** relPath -> owning package, retained for status/reparse routing. */
  fileToPackage: Map<string, WorkspacePackage>;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

const ownerNodeId = (pkg: WorkspacePackage): string =>
  pkg.type === 'app' ? appId(pkg.name) : packageId(pkg.name);

const TSCONFIG_CANDIDATES = [
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.build.json',
];

const findTsconfig = (pkgAbsPath: string): string | null => {
  for (const candidate of TSCONFIG_CANDIDATES) {
    const full = path.join(pkgAbsPath, candidate);
    if (fs.existsSync(full)) return full;
  }
  return null;
};

// Fallback globs only used when a package ships no tsconfig at all. The primary
// path drives file inclusion from the tsconfig's own `include`/`files`.
const FALLBACK_GLOBS = ['**/*.{ts,tsx}'];

/**
 * Build the purely-syntactic structural Project for a package.
 *
 * - When the package has a tsconfig we load it (`tsConfigFilePath`) so `paths`,
 *   `baseUrl`, and `jsx` come straight from the repo and aliases like `@/*`
 *   resolve. File inclusion follows the tsconfig's `include`/`files`.
 * - `skipFileDependencyResolution: true`: the structural pass is syntactic and
 *   never invokes the type-checker, so we skip pulling in transitive deps. The
 *   separate typecheck Project keeps this `false`.
 * - `maxFilesPerPackage` is enforced after loading.
 */
const buildPackageProject = (
  pkg: WorkspacePackage,
  config: IndexerConfig,
): Project => {
  const tsConfigFilePath = findTsconfig(pkg.absPath);

  const project = new Project({
    tsConfigFilePath: tsConfigFilePath ?? undefined,
    // Even with a tsconfig we add files explicitly below so we can enforce
    // `maxFilesPerPackage` and our exclude list deterministically.
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    ...(tsConfigFilePath
      ? {}
      : {
          compilerOptions: {
            allowJs: false,
            jsx: ts.JsxEmit.ReactJSX,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            baseUrl: pkg.absPath,
          },
        }),
  });

  const excludeGlobs = config.excludeDirs.map(
    (d) => `!${path.join(pkg.absPath, '**', d, '**')}`,
  );

  if (tsConfigFilePath) {
    // Honor the tsconfig's own file set (include/files/rootDir) rather than a
    // hard-coded folder allowlist, so `features/`, `hooks/`, etc. are globbed.
    const fromTsconfig = project.addSourceFilesFromTsConfig(tsConfigFilePath);
    if (fromTsconfig.length === 0) {
      project.addSourceFilesAtPaths([
        ...FALLBACK_GLOBS.map((g) => path.join(pkg.absPath, g)),
        '!**/*.d.ts',
        '!**/node_modules/**',
        ...excludeGlobs,
      ]);
    }
  } else {
    project.addSourceFilesAtPaths([
      ...FALLBACK_GLOBS.map((g) => path.join(pkg.absPath, g)),
      '!**/*.d.ts',
      '!**/node_modules/**',
      ...excludeGlobs,
    ]);
  }

  enforceFileBudget(project, pkg, config.maxFilesPerPackage);
  return project;
};

// Drop files beyond the configured budget so a pathological package can't make
// indexing unbounded. We keep the lexically-first files for determinism.
const enforceFileBudget = (
  project: Project,
  pkg: WorkspacePackage,
  max: number,
): void => {
  const sources = project
    .getSourceFiles()
    .filter((s) => !s.getFilePath().includes('node_modules'))
    .sort((a, b) => a.getFilePath().localeCompare(b.getFilePath()));
  if (sources.length <= max) return;
  for (const extra of sources.slice(max)) {
    project.removeSourceFile(extra);
  }
  console.warn(
    `[code-indexer] ${pkg.name}: ${sources.length} files exceeds maxFilesPerPackage=${max}; indexing first ${max}.`,
  );
};

const fileNode = (
  relPath: string,
  ownerId: string,
  loc: number,
  contentHash: string | null,
): FileNode => ({
  id: fileId(relPath),
  type: 'file',
  name: path.basename(relPath),
  path: relPath,
  parentId: ownerId,
  contentHash,
  status: emptyStatus(),
  knowledge: null,
  git: null,
  metrics: { loc, exportsCount: 0 },
});

export type FileExtraction = {
  rel: string;
  contentHash: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

/**
 * Extract nodes + edges for a single source file. Reused by the full index,
 * incremental reindex, and live reparse. Stamps every produced node with the
 * file's content hash so the incremental cache can detect change/no-change.
 * Throws are the caller's responsibility to catch (one bad file must not abort
 * the whole index).
 */
export const extractFile = (
  source: SourceFile,
  rel: string,
  pkg: WorkspacePackage,
  workspaceRoot: string,
  folders: Map<string, GraphNode>,
  folderEdges: GraphEdge[],
): FileExtraction => {
  const ownerId = ownerNodeId(pkg);
  const contentHash = hashContent(source.getFullText());
  const parentId = ensureFolderChain(
    pkg.relPath,
    rel,
    ownerId,
    folders,
    folderEdges,
  );
  const loc = source.getEndLineNumber();
  const file = fileNode(rel, parentId, loc, contentHash);
  const symbols = extractSymbolNodes(source, rel);
  file.metrics.exportsCount = symbols.nodes.length;

  const nodes: GraphNode[] = [file, ...symbols.nodes];
  // Stamp the file's content hash onto its symbol nodes too, so editing the
  // file invalidates all of its symbols in the incremental cache.
  for (const n of symbols.nodes) {
    if ('contentHash' in n) n.contentHash = contentHash;
  }

  const edges: GraphEdge[] = [
    {
      id: edgeId(parentId, file.id, 'contains'),
      source: parentId,
      target: file.id,
      type: 'contains',
      weight: 1,
    },
    ...symbols.edges,
    ...extractImportEdges(source, rel, workspaceRoot),
  ];

  return { rel, contentHash, nodes, edges };
};

/**
 * Subgraph (file node + its symbol nodes + its outgoing edges) keyed by file
 * relPath, reconstructed from a previous snapshot so unchanged files can be
 * reused on an incremental reindex without re-parsing.
 */
export type ReusableSubgraph = {
  hashes: Record<string, string>;
  nodesByFile: Map<string, GraphNode[]>;
  edgesByFile: Map<string, GraphEdge[]>;
};

export type PriorIndex = ReusableSubgraph | null;

export const indexStructure = (
  config: IndexerConfig,
  workspace: Workspace,
  prior: PriorIndex = null,
): StructuralResult & { reusedFiles: number; reparsedFiles: number } => {
  const projects = new Map<string, Project>();
  const fileToProject = new Map<string, Project>();
  const fileToPackage = new Map<string, WorkspacePackage>();

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const folders = new Map<string, GraphNode>();
  let reusedFiles = 0;
  let reparsedFiles = 0;

  for (const pkg of workspace.packages) {
    let project: Project;
    try {
      project = buildPackageProject(pkg, config);
    } catch (err) {
      console.warn(
        `[code-indexer] failed to set up project for ${pkg.name}: ${(err as Error).message}`,
      );
      continue;
    }
    projects.set(pkg.name, project);

    for (const source of project.getSourceFiles()) {
      const abs = source.getFilePath();
      if (abs.includes('node_modules')) continue;
      if (!isSourceFile(abs)) continue;
      if (!abs.startsWith(pkg.absPath + path.sep)) continue;

      const rel = path.relative(workspace.root, abs);
      if (fileToPackage.has(rel)) continue; // first package wins
      fileToProject.set(rel, project);
      fileToPackage.set(rel, pkg);

      // Incremental skip: if the file's content hash matches the prior index and
      // we have its cached subgraph, reuse it instead of re-extracting.
      if (prior) {
        const currentHash = hashContent(source.getFullText());
        if (
          prior.hashes[rel] === currentHash &&
          prior.nodesByFile.has(rel)
        ) {
          // Folder chain must still exist even for reused files.
          ensureFolderChain(pkg.relPath, rel, ownerNodeId(pkg), folders, edges);
          nodes.push(...(prior.nodesByFile.get(rel) ?? []));
          edges.push(...(prior.edgesByFile.get(rel) ?? []));
          reusedFiles += 1;
          continue;
        }
      }

      try {
        const result = extractFile(
          source,
          rel,
          pkg,
          workspace.root,
          folders,
          edges,
        );
        nodes.push(...result.nodes);
        edges.push(...result.edges);
        reparsedFiles += 1;
      } catch (err) {
        // One unparseable file must not abort the whole index — log and skip.
        console.warn(
          `[code-indexer] skipped ${rel}: ${(err as Error).message}`,
        );
        fileToProject.delete(rel);
        fileToPackage.delete(rel);
      }
    }
  }

  nodes.push(...folders.values());

  return {
    projects,
    fileToProject,
    fileToPackage,
    nodes,
    edges,
    reusedFiles,
    reparsedFiles,
  };
};

/**
 * Rebuild a reusable subgraph index from a previous snapshot. Maps each file's
 * relPath to its file node + descendant symbol nodes and their outgoing edges,
 * so an incremental reindex can splice unchanged files back in verbatim.
 */
export const buildReusableSubgraph = (
  snapshot: { nodes: GraphNode[]; edges: GraphEdge[] },
  hashes: Record<string, string>,
): ReusableSubgraph => {
  const nodesByFile = new Map<string, GraphNode[]>();
  const edgesByFile = new Map<string, GraphEdge[]>();
  const nodeIdToFile = new Map<string, string>();

  for (const node of snapshot.nodes) {
    if (node.type === 'file') {
      const rel = node.path;
      nodesByFile.set(rel, [node]);
      nodeIdToFile.set(node.id, rel);
    }
  }
  // Attach symbol nodes (component/function) to their file via parentId.
  const fileIdToRel = new Map<string, string>();
  for (const [rel, [fileN]] of nodesByFile) {
    if (fileN) fileIdToRel.set(fileN.id, rel);
  }
  for (const node of snapshot.nodes) {
    if (node.type !== 'component' && node.type !== 'function') continue;
    const rel = node.parentId ? fileIdToRel.get(node.parentId) : undefined;
    if (!rel) continue;
    nodesByFile.get(rel)?.push(node);
    nodeIdToFile.set(node.id, rel);
  }
  // Attach an edge to a file when either endpoint belongs to that file:
  //   - source-owned: `file imports x`, `file/symbol contains symbol`
  //   - target-owned: the `folder -> file` contains edge (folder is rebuilt by
  //     ensureFolderChain, but the edge itself must be re-spliced on reuse).
  // De-dup so an intra-file edge isn't added twice.
  for (const edge of snapshot.edges) {
    const sourceRel = nodeIdToFile.get(edge.source);
    const targetRel = nodeIdToFile.get(edge.target);
    const owner = sourceRel ?? targetRel;
    if (!owner) continue;
    if (sourceRel && targetRel && sourceRel !== targetRel) {
      // Cross-file edge (import): keep it on the importing (source) side only.
      const list = edgesByFile.get(sourceRel) ?? [];
      list.push(edge);
      edgesByFile.set(sourceRel, list);
      continue;
    }
    const list = edgesByFile.get(owner) ?? [];
    list.push(edge);
    edgesByFile.set(owner, list);
  }

  return { hashes, nodesByFile, edgesByFile };
};
