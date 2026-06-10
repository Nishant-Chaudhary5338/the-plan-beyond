import { Router } from 'express';
import type { GraphService } from '../graph-service.js';

export const graphRouter = (graph: GraphService): Router => {
  const router = Router();

  router.get('/graph', (_req, res) => {
    const snapshot = graph.getSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'Graph not indexed yet' });
      return;
    }
    res.json(snapshot);
  });

  router.get('/node/:id', (req, res) => {
    const node = graph.getNode(req.params.id);
    if (!node) {
      res.status(404).json({ error: `Node not found: ${req.params.id}` });
      return;
    }
    res.json({ node });
  });

  return router;
};
