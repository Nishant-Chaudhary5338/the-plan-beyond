#!/usr/bin/env tsx
/**
 * prove-any-repo — a "prove any repo" harness.
 *
 * Indexes a corpus of diverse, real public TS/React repositories with the very
 * same engine entry point the CLI and MCP server use (`runFullIndex(createConfig(root))`),
 * and emits a results table so we can see, at a glance, that the indexer produces
 * a non-trivial code graph on shapes it has never seen: plain Vite SPAs, barrel-
 * heavy component libraries, turbo/Nx monorepos, Next.js apps, and large apps.
 *
 * Usage (run via tsx from the mcp-indexer repo root):
 *   tsx tools/code-indexer/scripts/prove-any-repo.ts                 # whole corpus (clones)
 *   tsx tools/code-indexer/scripts/prove-any-repo.ts --only <name>   # one corpus entry
 *   tsx tools/code-indexer/scripts/prove-any-repo.ts --root <path>   # an already-local dir (no clone)
 *   tsx tools/code-indexer/scripts/prove-any-repo.ts --root ../app --only the-plan-beyond-app
 *
 * Network note: cloning the real corpus is slow and network-bound; the harness is
 * idempotent (a clone is skipped when its cache dir already exists) but a full
 * corpus run is meant to be a separate, gated step. The `--root` flag indexes a
 * local directory with no network at all, which is how we validate the harness
 * end-to-end against the sibling app.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runFullIndex } from '../src/engine/index.js';
import { createConfig } from '../src/config.js';
import type { GraphSnapshot } from '@repo/code-graph-core';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
// tools/code-indexer/scripts -> tools/code-indexer
const PACKAGE_DIR = path.resolve(SCRIPT_DIR, '..');
// tools/code-indexer -> repo root (mcp-indexer)
const REPO_ROOT = path.resolve(PACKAGE_DIR, '..', '..');

const CORPUS_PATH = path.join(SCRIPT_DIR, 'corpus.json');
const CACHE_DIR = path.join(PACKAGE_DIR, '.proof-cache');
const RESULTS_MD = path.join(SCRIPT_DIR, 'PROOF_RESULTS.md');
const RESULTS_JSON = path.join(SCRIPT_DIR, 'PROOF_RESULTS.json');

// ---------------------------------------------------------------------------
// Corpus schema (kept local; the harness owns nothing in the engine's contract)
// ---------------------------------------------------------------------------

type CorpusEntry = {
  name: string;
  gitUrl: string;
  ref: string;
  subdir?: string;
  kind: string;
  comment?: string;
};

const NODE_TYPES = [
  'repo',
  'app',
  'package',
  'folder',
  'file',
  'component',
  'function',
] as const;
type NodeTypeKey = (typeof NODE_TYPES)[number];

const EDGE_TYPES = [
  'contains',
  'imports',
  'calls',
  'depends-on',
  'renders',
  'references',
] as const;
type EdgeTypeKey = (typeof EDGE_TYPES)[number];

type RepoResult = {
  name: string;
  kind: string;
  source: string; // gitUrl#ref, "local:<path>", or the resolved root for local runs
  ok: boolean;
  nodesTotal: number;
  edgesTotal: number;
  nodesByType: Record<NodeTypeKey, number>;
  edgesByType: Record<EdgeTypeKey, number>;
  durationMs: number;
  error: string | null;
};

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

type ParsedArgs = { only: string | null; root: string | null };

const parseArgs = (argv: string[]): ParsedArgs => {
  let only: string | null = null;
  let root: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--only') {
      only = argv[i + 1] ?? null;
      i += 1;
    } else if (flag === '--root') {
      root = argv[i + 1] ?? null;
      i += 1;
    }
  }
  return { only, root };
};

// ---------------------------------------------------------------------------
// Counting
// ---------------------------------------------------------------------------

const zeroNodeCounts = (): Record<NodeTypeKey, number> =>
  NODE_TYPES.reduce(
    (acc, t) => {
      acc[t] = 0;
      return acc;
    },
    {} as Record<NodeTypeKey, number>,
  );

const zeroEdgeCounts = (): Record<EdgeTypeKey, number> =>
  EDGE_TYPES.reduce(
    (acc, t) => {
      acc[t] = 0;
      return acc;
    },
    {} as Record<EdgeTypeKey, number>,
  );

const isNodeType = (t: string): t is NodeTypeKey =>
  (NODE_TYPES as readonly string[]).includes(t);
const isEdgeType = (t: string): t is EdgeTypeKey =>
  (EDGE_TYPES as readonly string[]).includes(t);

const countSnapshot = (
  snapshot: GraphSnapshot,
): { nodesByType: Record<NodeTypeKey, number>; edgesByType: Record<EdgeTypeKey, number> } => {
  const nodesByType = zeroNodeCounts();
  for (const node of snapshot.nodes) {
    if (isNodeType(node.type)) nodesByType[node.type] += 1;
  }
  const edgesByType = zeroEdgeCounts();
  for (const edge of snapshot.edges) {
    if (isEdgeType(edge.type)) edgesByType[edge.type] += 1;
  }
  return { nodesByType, edgesByType };
};

// ---------------------------------------------------------------------------
// Clone (idempotent / cached) + root resolution
// ---------------------------------------------------------------------------

/**
 * Shallow-clone an entry into `.proof-cache/<name>` only if that dir does not
 * already exist. Returns the absolute clone dir on success, or an Error message
 * string on failure (the caller records it and continues to the next entry).
 */
const ensureClone = (entry: CorpusEntry): { dir: string } | { error: string } => {
  const dir = path.join(CACHE_DIR, entry.name);
  if (fs.existsSync(dir)) {
    return { dir }; // cached — idempotent, no network.
  }
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const args = [
    'clone',
    '--depth',
    '1',
    '--branch',
    entry.ref,
    '--single-branch',
    entry.gitUrl,
    dir,
  ];
  const result = spawnSync('git', args, {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) {
    return { error: `git clone failed to spawn: ${result.error.message}` };
  }
  if (result.status !== 0) {
    const stderr = (result.stderr ?? '').trim();
    // A failed clone can leave a partial dir behind; clean it so a re-run retries.
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
    return {
      error: `git clone exited ${result.status ?? 'null'}: ${stderr.slice(0, 300)}`,
    };
  }
  return { dir };
};

const resolveRoot = (cloneDir: string, subdir?: string): string =>
  subdir ? path.join(cloneDir, subdir) : cloneDir;

// ---------------------------------------------------------------------------
// Index one root in-process (the exact engine call the CLI makes)
// ---------------------------------------------------------------------------

const indexRoot = (
  meta: { name: string; kind: string; source: string },
  root: string,
): RepoResult => {
  const base = {
    name: meta.name,
    kind: meta.kind,
    source: meta.source,
    nodesByType: zeroNodeCounts(),
    edgesByType: zeroEdgeCounts(),
  };

  if (!fs.existsSync(root)) {
    return {
      ...base,
      ok: false,
      nodesTotal: 0,
      edgesTotal: 0,
      durationMs: 0,
      error: `index root does not exist: ${root}`,
    };
  }

  const startedAt = Date.now();
  try {
    // Mirror the CLI exactly: runFullIndex(createConfig(root)).
    const { snapshot, durationMs } = runFullIndex(createConfig(root));
    const { nodesByType, edgesByType } = countSnapshot(snapshot);
    return {
      ...base,
      ok: true,
      nodesTotal: snapshot.nodes.length,
      edgesTotal: snapshot.edges.length,
      nodesByType,
      edgesByType,
      durationMs,
    };
  } catch (err) {
    return {
      ...base,
      ok: false,
      nodesTotal: 0,
      edgesTotal: 0,
      durationMs: Date.now() - startedAt,
      error: err instanceof Error ? (err.stack ?? err.message) : String(err),
    };
  }
};

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const oneLineError = (error: string | null): string =>
  error ? error.split('\n')[0]?.slice(0, 120) ?? '' : '';

const mdRow = (r: RepoResult): string => {
  const status = r.ok ? 'ok' : `FAILED — ${oneLineError(r.error)}`;
  const cells = [
    r.name,
    r.kind,
    String(r.nodesTotal),
    String(r.edgesTotal),
    String(r.nodesByType.component),
    String(r.nodesByType.function),
    String(r.edgesByType.renders),
    String(r.edgesByType.calls),
    `${r.durationMs}ms`,
    status,
  ];
  return `| ${cells.join(' | ')} |`;
};

const renderMarkdown = (results: RepoResult[]): string => {
  const header = `# Prove-any-repo results

Generated by \`tools/code-indexer/scripts/prove-any-repo.ts\` on ${new Date().toISOString()}.

This harness indexes a corpus of **diverse, real public TS/React repositories**
with the exact engine entry the CLI and MCP server use —
\`runFullIndex(createConfig(root))\` — to demonstrate that the indexer emits a
non-trivial code graph (files, components, functions, and the
\`imports/references/renders/calls/contains/depends-on\` edges between them) on
shapes it has never seen before: a plain Vite + React SPA, a barrel-heavy
component library, turbo/monorepo apps, a Next.js app, and large real-world
applications. The corpus is described in
[\`corpus.json\`](./corpus.json).

> **These numbers are a floor, not a ceiling.** Symbol-level edges
> (\`renders\`/\`calls\`) are emitted **conservatively** — only when a target
> resolves to a real indexed node — so recall improves as the recall-gap work
> lands. Treat the table as a regression baseline that should trend **up** over
> time, never down.

| Repo | Kind | Nodes | Edges | Components | Functions | renders | calls | Time | Status |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |`;

  const rows = results.map(mdRow).join('\n');

  const okCount = results.filter((r) => r.ok).length;
  const footer = `

## Per-edge-type totals

| Repo | contains | imports | references | renders | calls | depends-on |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${results
  .map(
    (r) =>
      `| ${r.name} | ${r.edgesByType.contains} | ${r.edgesByType.imports} | ${r.edgesByType.references} | ${r.edgesByType.renders} | ${r.edgesByType.calls} | ${r.edgesByType['depends-on']} |`,
  )
  .join('\n')}

**${okCount}/${results.length}** repositories indexed successfully. Raw data:
[\`PROOF_RESULTS.json\`](./PROOF_RESULTS.json).
`;

  return `${header}\n${rows}\n${footer}`;
};

const printConsoleSummary = (results: RepoResult[]): void => {
  console.log('');
  console.log('Prove-any-repo summary');
  console.log('----------------------');
  for (const r of results) {
    const status = r.ok ? 'ok' : `FAILED (${oneLineError(r.error)})`;
    console.log(
      `${r.name.padEnd(28)} ${String(r.nodesTotal).padStart(6)} nodes  ` +
        `${String(r.edgesTotal).padStart(6)} edges  ` +
        `${String(r.durationMs).padStart(7)}ms  ${status}`,
    );
  }
  console.log('');
};

// ---------------------------------------------------------------------------
// Corpus loading
// ---------------------------------------------------------------------------

const loadCorpus = (): CorpusEntry[] => {
  const raw = fs.readFileSync(CORPUS_PATH, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('corpus.json must be a JSON array');
  }
  return parsed.map((item, idx) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`corpus.json entry ${idx} is not an object`);
    }
    const e = item as Record<string, unknown>;
    const { name, gitUrl, ref, kind } = e;
    if (
      typeof name !== 'string' ||
      typeof gitUrl !== 'string' ||
      typeof ref !== 'string' ||
      typeof kind !== 'string'
    ) {
      throw new Error(
        `corpus.json entry ${idx} is missing required string fields (name, gitUrl, ref, kind)`,
      );
    }
    const entry: CorpusEntry = { name, gitUrl, ref, kind };
    if (typeof e.subdir === 'string') entry.subdir = e.subdir;
    if (typeof e.comment === 'string') entry.comment = e.comment;
    return entry;
  });
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = (): void => {
  const { only, root } = parseArgs(process.argv.slice(2));
  const results: RepoResult[] = [];

  if (root) {
    // Local mode: index an already-on-disk directory, no clone, no network.
    // `--root` is resolved relative to the repo root (so `../app` means the
    // sibling app), matching how the CLI's `--root` is documented.
    const resolved = path.isAbsolute(root) ? root : path.resolve(REPO_ROOT, root);
    const name = only ?? path.basename(resolved);
    console.log(`Indexing local root: ${resolved} (as "${name}")`);
    results.push(
      indexRoot(
        { name, kind: 'local', source: `local:${resolved}` },
        resolved,
      ),
    );
  } else {
    // Corpus mode: clone (cached) + index each selected entry.
    const corpus = loadCorpus();
    const selected = only ? corpus.filter((e) => e.name === only) : corpus;
    if (only && selected.length === 0) {
      console.error(
        `No corpus entry named "${only}". Known: ${corpus.map((e) => e.name).join(', ')}`,
      );
      process.exit(1);
    }

    for (const entry of selected) {
      console.log(`\n=== ${entry.name} (${entry.kind}) ===`);
      const source = `${entry.gitUrl}#${entry.ref}`;
      const meta = { name: entry.name, kind: entry.kind, source };

      const clone = ensureClone(entry);
      if ('error' in clone) {
        console.error(`  clone failed: ${clone.error}`);
        results.push({
          name: entry.name,
          kind: entry.kind,
          source,
          ok: false,
          nodesTotal: 0,
          edgesTotal: 0,
          nodesByType: zeroNodeCounts(),
          edgesByType: zeroEdgeCounts(),
          durationMs: 0,
          error: clone.error,
        });
        continue;
      }

      const indexRootPath = resolveRoot(clone.dir, entry.subdir);
      console.log(`  indexing root: ${indexRootPath}`);
      const result = indexRoot(meta, indexRootPath);
      if (result.ok) {
        console.log(
          `  ok: ${result.nodesTotal} nodes, ${result.edgesTotal} edges in ${result.durationMs}ms`,
        );
      } else {
        console.error(`  FAILED: ${oneLineError(result.error)}`);
      }
      results.push(result);
    }
  }

  // Emit artifacts.
  fs.writeFileSync(RESULTS_JSON, `${JSON.stringify(results, null, 2)}\n`, 'utf-8');
  fs.writeFileSync(RESULTS_MD, renderMarkdown(results), 'utf-8');

  printConsoleSummary(results);
  console.log(`Wrote ${path.relative(REPO_ROOT, RESULTS_MD)}`);
  console.log(`Wrote ${path.relative(REPO_ROOT, RESULTS_JSON)}`);

  // Non-zero exit if every run failed, so CI can gate on it; a partial corpus
  // failure (some repos unreachable) still exits 0 as long as one indexed.
  if (results.length > 0 && results.every((r) => !r.ok)) {
    process.exit(1);
  }
};

main();
