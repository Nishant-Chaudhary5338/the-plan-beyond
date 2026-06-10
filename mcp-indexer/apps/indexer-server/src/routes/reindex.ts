import { Router } from 'express';
import type { GraphService } from '../graph-service.js';

export const reindexRouter = (graph: GraphService): Router => {
  const router = Router();

  router.post('/reindex', (_req, res) => {
    const startedAt = Date.now();
    const snapshot = graph.indexFull();
    res.json({
      nodeCount: snapshot.meta.nodeCount,
      edgeCount: snapshot.meta.edgeCount,
      durationMs: Date.now() - startedAt,
    });
  });

  return router;
};
