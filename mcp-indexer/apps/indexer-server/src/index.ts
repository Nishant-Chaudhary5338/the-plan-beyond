import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { existsSync } from 'node:fs';
import * as path from 'path';
import express from 'express';
import cors from 'cors';
import { GraphService } from './graph-service.js';
import { graphRouter } from './routes/graph.js';
import { reindexRouter } from './routes/reindex.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { attachWsHub } from './ws-hub.js';
import { startWatcher } from './watcher.js';

const PORT = 3002;
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

const app = express();
app.use(cors({ origin: /^http:\/\/localhost:\d+$/ }));
app.use(express.json());

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', port: PORT, indexed: graph.getSnapshot() !== null }),
);
app.use('/api', graphRouter(graph));
app.use('/api', reindexRouter(graph));
app.use('/api', knowledgeRouter(graph));

const server = createServer(app);
attachWsHub(server, graph);

server.listen(PORT, () => {
  console.log(`\n🔭 Indexer server on http://localhost:${PORT}`);
  console.log(`   root: ${REPO_ROOT}`);
  console.log('   indexing…');
  const startedAt = Date.now();
  const snapshot = graph.indexFull();
  console.log(
    `   ✓ ${snapshot.meta.nodeCount} nodes · ${snapshot.meta.edgeCount} edges in ${Date.now() - startedAt}ms`,
  );
  console.log('   GET  /api/graph · GET /api/node/:id · POST /api/reindex · WS /ws');
  console.log('   enriching status in background…');
  void graph.enrichStatusProgressive().then(async () => {
    console.log('   ✓ status enrichment complete');
    await startWatcher(REPO_ROOT, graph);
    console.log('   👀 watching for changes — edit a file to see it update live\n');
  });
});
