import * as path from 'path';
import { Project, SourceFile, ts } from 'ts-morph';
import type { GraphNode, GraphEdge } from '@repo/code-graph-core';
import { fileId, edgeId, emptyStatus } from '@repo/code-graph-core';
import type { IndexerConfig } from '../../config.js';
import { isSourceFile } from '../../config.js';
import type { Workspace, WorkspacePackage } from '../discovery/discover-workspace.js';
import { extractSymbolNodes } from './symbol-nodes.js';
import { extractImportEdges } from './import-edges.js';
import { ensureFolderChain } from './folder-tree.js';
import { packageId, appId } from '@repo/code-graph-core';

export type StructuralResult = {
  project: Project;
  nodes: GraphNode[];
  edges: GraphEdge[];
  fileToPackage: Map<string, string>;
};

const ownerNodeId = (pkg: WorkspacePackage): string =>
  pkg.type === 'app' ? appId(pkg.name) : packageId(pkg.name);

export const buildProject = (config: IndexerConfig): Project =>
  new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: false,
    compilerOptions: {
      allowJs: false,
      jsx: ts.JsxEmit.ReactJSX,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      baseUrl: config.root,
    },
  });

const SOURCE_GLOBS = [
  'src/**/*.{ts,tsx}',
  'components/**/*.{ts,tsx}',
  'server/**/*.{ts,tsx}',
  'app/**/*.{ts,tsx}',
  'lib/**/*.{ts,tsx}',
];

const addPackageFiles = (project: Project, pkg: WorkspacePackage): void => {
  const globs = SOURCE_GLOBS.map((g) => path.join(pkg.absPath, g));
  project.addSourceFilesAtPaths([...globs, '!**/*.d.ts', '!**/node_modules/**']);
};

const fileNode = (relPath: string, ownerId: string, loc: number): GraphNode => ({
  id: fileId(relPath),
  type: 'file',
  name: path.basename(relPath),
  path: relPath,
  parentId: ownerId,
  span: null,
  contentHash: null,
  status: emptyStatus(),
  knowledge: null,
  git: null,
  bundleBytes: null,
  metrics: { loc, exportsCount: 0 },
});

export const indexStructure = (
  config: IndexerConfig,
  workspace: Workspace,
): StructuralResult => {
  const project = buildProject(config);
  for (const pkg of workspace.packages) addPackageFiles(project, pkg);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const folders = new Map<string, GraphNode>();
  const fileToPackage = new Map<string, string>();

  type Entry = { source: SourceFile; ownerId: string; pkgRelPath: string };
  const byRel = new Map<string, Entry>();
  for (const pkg of workspace.packages) {
    const ownerId = ownerNodeId(pkg);
    for (const source of project.getSourceFiles()) {
      const abs = source.getFilePath();
      if (!abs.startsWith(pkg.absPath + path.sep)) continue;
      if (!isSourceFile(abs)) continue;
      const rel = path.relative(workspace.root, abs);
      if (byRel.has(rel)) continue;
      byRel.set(rel, { source, ownerId, pkgRelPath: pkg.relPath });
    }
  }

  for (const [rel, { source, ownerId, pkgRelPath }] of byRel) {
    const parentId = ensureFolderChain(pkgRelPath, rel, ownerId, folders, edges);
    const loc = source.getEndLineNumber();
    const file = fileNode(rel, parentId, loc);
    const symbols = extractSymbolNodes(source, rel);
    file.metrics.exportsCount = symbols.nodes.length;

    nodes.push(file, ...symbols.nodes);
    edges.push(
      { id: edgeId(parentId, file.id, 'contains'), source: parentId, target: file.id, type: 'contains', weight: 1 },
      ...symbols.edges,
    );
    fileToPackage.set(rel, ownerId);
  }

  nodes.push(...folders.values());

  for (const [rel, { source }] of byRel) {
    edges.push(...extractImportEdges(source, rel, workspace.root));
  }

  return { project, nodes, edges, fileToPackage };
};
