import * as path from 'path';
import { Node, SyntaxKind, type SourceFile } from 'ts-morph';
import type { GraphEdge, EdgeType } from '@repo/code-graph-core';
import { fileId, externalId, edgeId } from '@repo/code-graph-core';

/**
 * The npm package a bare import specifier belongs to, or null when it is a
 * relative import or a path alias (`@/…`, `~/…`) — those resolve internally.
 *   `react` → `react` · `react-dom/client` → `react-dom`
 *   `@scope/pkg/sub` → `@scope/pkg` · `lodash/merge` → `lodash`
 */
export const externalPackage = (specifier: string): string | null => {
  if (specifier.startsWith('.') || specifier.startsWith('@/') || specifier.startsWith('~')) {
    return null;
  }
  const parts = specifier.split('/');
  if (specifier.startsWith('@')) {
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }
  return parts[0] ?? null;
};

const toRel = (root: string, target: SourceFile): string | null => {
  const abs = target.getFilePath();
  if (abs.includes('node_modules')) return null;
  const rel = path.relative(root, abs);
  if (rel.startsWith('..')) return null;
  return rel;
};

/**
 * Extract dependency edges for a single source file. Beyond plain
 * `import ... from`, this also walks:
 *   - re-export barrels (`export ... from './x'`, `export * from './x'`)
 *   - dynamic imports (`import('./x')`)
 *   - type-only imports/exports — emitted as `references` edges (type coupling)
 *     rather than `imports` edges, so they do not inflate runtime coupling.
 *
 * Path-alias (`@/*`, baseUrl) resolution is handled by ts-morph's module
 * resolution, which is driven by each package's real tsconfig (see
 * micro-symbols.ts).
 */
export const extractImportEdges = (
  source: SourceFile,
  relPath: string,
  root: string,
  opts: { externals?: boolean; workspacePackages?: ReadonlySet<string> } = {},
): GraphEdge[] => {
  const sourceId = fileId(relPath);

  // Accumulate weights per (target, edge-type). Runtime imports -> `imports`,
  // type-only -> `references`.
  const weights = new Map<string, { targetId: string; type: EdgeType; weight: number }>();
  const addTarget = (targetId: string, type: EdgeType): void => {
    if (targetId === sourceId) return;
    const key = `${targetId}:${type}`;
    const existing = weights.get(key);
    if (existing) existing.weight += 1;
    else weights.set(key, { targetId, type, weight: 1 });
  };
  const add = (targetRel: string, type: EdgeType): void =>
    addTarget(fileId(targetRel), type);

  // Resolve one module reference: an internal file becomes a file→file edge; an
  // unresolved bare specifier becomes a file→external (node_modules) edge when
  // `externals` is on. Returns nothing for relative imports that don't resolve.
  const record = (
    resolved: SourceFile | undefined,
    typeOnly: boolean,
    specifier: string,
  ): void => {
    const targetRel = resolved ? toRel(root, resolved) : null;
    if (targetRel) {
      add(targetRel, typeOnly ? 'references' : 'imports');
      return;
    }
    if (!opts.externals) return;
    const pkg = externalPackage(specifier);
    // A workspace package (monorepo sibling) is NOT external — it lives in the
    // graph as its own package node, and the package-level `depends-on` edge
    // already records the dependency. Skip it so it isn't mistaken for a
    // node_modules leaf when ts-morph resolves it through a workspace symlink.
    if (!pkg || opts.workspacePackages?.has(pkg)) return;
    addTarget(externalId(pkg), typeOnly ? 'references' : 'imports');
  };

  // 1. Static imports.
  for (const decl of source.getImportDeclarations()) {
    record(decl.getModuleSpecifierSourceFile(), decl.isTypeOnly(), decl.getModuleSpecifierValue());
  }

  // 2. Re-export barrels: `export { x } from './x'`, `export * from './x'`.
  for (const decl of source.getExportDeclarations()) {
    const spec = decl.getModuleSpecifier();
    if (!spec) continue; // local re-export, no specifier
    record(decl.getModuleSpecifierSourceFile(), decl.isTypeOnly(), spec.getLiteralValue());
  }

  // 3. Dynamic imports: `import('./x')`. ts-morph exposes the specifier source
  //    file on the call's argument via the import expression.
  for (const call of source.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (call.getExpression().getKind() !== SyntaxKind.ImportKeyword) continue;
    const arg = call.getArguments()[0];
    if (!arg || !Node.isStringLiteral(arg)) continue;
    const specifier = arg.getLiteralValue();
    const resolved = resolveSpecifier(source, specifier);
    record(resolved, false, specifier);
  }

  return [...weights.values()].map(({ targetId, type, weight }) => ({
    id: edgeId(sourceId, targetId, type),
    source: sourceId,
    target: targetId,
    type,
    weight,
  }));
};

/**
 * Resolve a dynamic-import string specifier to a SourceFile. Relative
 * specifiers are resolved against the importing file's directory; alias/bare
 * specifiers fall back to whatever an equivalent static import resolved to.
 */
const resolveSpecifier = (
  origin: SourceFile,
  specifier: string,
): SourceFile | undefined => {
  const relative = tryRelative(origin, specifier);
  if (relative) return relative;
  // Alias specifier (e.g. `@/x`): reuse a static import's resolution if one
  // points at the same module (ts-morph resolves those via tsconfig paths).
  return origin
    .getImportDeclarations()
    .find((d) => d.getModuleSpecifierValue() === specifier)
    ?.getModuleSpecifierSourceFile();
};

const CANDIDATE_EXTS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

const tryRelative = (origin: SourceFile, specifier: string): SourceFile | undefined => {
  if (!specifier.startsWith('.')) return undefined;
  const project = origin.getProject();
  const baseDir = path.dirname(origin.getFilePath());
  const resolvedBase = path.resolve(baseDir, specifier);
  for (const ext of ['', ...CANDIDATE_EXTS]) {
    const candidate = resolvedBase + ext;
    const sf = project.getSourceFile(candidate);
    if (sf) return sf;
  }
  return undefined;
};
