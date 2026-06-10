import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { existsSync } from 'node:fs';
import * as path from 'path';
import express from 'express';
import cors from 'cors';
import type { AsyncSubscription } from '@parcel/watcher';
import { GraphService } from './graph-service.js';
import { graphRouter } from './routes/graph.js';
import { reindexRouter } from './routes/reindex.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { attachWsHub, type WsHub } from './ws-hub.js';
import { startWatcher } from './watcher.js';
import { errorHandler, notFoundHandler } from './http-utils.js';
import { killAllClaudeChildren } from './claude-cli.js';

const PORT = Number(process.env.INDEXER_PORT ?? 3002);
// Bind to loopback only: this server exposes unauthenticated mutating + LLM
// endpoints, so it must not be reachable off-host.
const HOST = '127.0.0.1';
const here = path.dirname(fileURLToPath(import.meta.url));

/** Walk up from `start` to the repo root (the dir holding pnpm-workspace.yaml). */
const findRepoRoot = (start: string): string => {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = path.dirname(dir);
  }
  return start;
};

// A relative INDEXER_ROOT (e.g. "../app") is resolved against the repo
// root, not the process cwd — so it behaves identically whether the server is
// launched from the repo root or via `pnpm --filter` (which changes cwd to the
// package dir). Absolute paths are used as-is. Defaults to indexing this repo.
const REPO_ROOT_DIR = findRepoRoot(here);
const REPO_ROOT = process.env.INDEXER_ROOT
  ? path.resolve(REPO_ROOT_DIR, process.env.INDEXER_ROOT)
  : REPO_ROOT_DIR;

const graph = new GraphService(REPO_ROOT);

// Tracks whether the live-edit watcher is up, surfaced via /health.
let watcherReady = false;

const app = express();
app.use(cors({ origin: /^http:\/\/localhost:\d+$/ }));
app.use(express.json({ limit: '256kb' }));

// Friendly root: this is a JSON API with no web UI, so make a browser hit to
// "/" self-describing instead of a bare 404.
app.get('/', (_req, res) => {
  const snapshot = graph.getSnapshot();
  res.json({
    service: 'code-intelligence indexer',
    status: 'ok',
    root: REPO_ROOT,
    indexed: snapshot !== null,
    watching: watcherReady,
    graph: snapshot ? { nodes: snapshot.meta.nodeCount, edges: snapshot.meta.edgeCount } : null,
    endpoints: {
      'GET /health': 'liveness + readiness',
      'GET /api/graph': 'the full code graph (nodes + edges)',
      'GET /api/node/:id': 'a single node with its source',
      'POST /api/reindex': 'force a full re-index',
      'POST /api/knowledge/:id': 'generate a knowledge summary for a node',
      'POST /api/chat': 'ask a question about the codebase',
      'WS /ws': 'live graph patches as files change',
    },
  });
});

app.get('/health', (_req, res) =>
  res.json({
    status: 'ok',
    port: PORT,
    indexed: graph.getSnapshot() !== null,
    watching: watcherReady,
  }),
);
app.use('/api', graphRouter(graph));
app.use('/api', reindexRouter(graph));
app.use('/api', knowledgeRouter(graph));

// 404 + terminal error middleware must be registered last.
app.use(notFoundHandler);
app.use(errorHandler);

const server = createServer(app);
const wsHub: WsHub = attachWsHub(server, graph);

// Captured for graceful shutdown.
let watcherSub: AsyncSubscription | null = null;
let shuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — shutting down…`);
  try {
    if (watcherSub) await watcherSub.unsubscribe();
  } catch (err) {
    console.error('watcher unsubscribe error:', err);
  }
  wsHub.close();
  killAllClaudeChildren();
  server.close(() => {
    console.log('   ✓ server closed');
    process.exit(0);
  });
  // Don't hang forever if a connection refuses to drain.
  setTimeout(() => process.exit(0), 5000).unref();
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

server.listen(PORT, HOST, () => {
  console.log(`\n🔭 Indexer server on http://${HOST}:${PORT}`);
  console.log(`   root: ${REPO_ROOT}`);
  console.log('   indexing…');
  const startedAt = Date.now();
  void graph
    .indexFull()
    .then(async (snapshot) => {
      console.log(
        `   ✓ ${snapshot.meta.nodeCount} nodes · ${snapshot.meta.edgeCount} edges in ${Date.now() - startedAt}ms`,
      );
      console.log('   GET  /api/graph · GET /api/node/:id · POST /api/reindex · WS /ws');
      console.log('   enriching status in background…');
      await graph.enrichStatusProgressive();
      console.log('   ✓ status enrichment complete');
      watcherSub = await startWatcher(REPO_ROOT, graph);
      watcherReady = true;
      console.log('   👀 watching for changes — edit a file to see it update live\n');
    })
    .catch((err) => {
      console.error('initial index failed:', err);
    });
});
