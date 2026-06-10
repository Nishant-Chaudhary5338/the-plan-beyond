import { Router } from 'express';
import type { GraphService } from '../graph-service.js';

export const knowledgeRouter = (graph: GraphService): Router => {
  const router = Router();

  router.post('/knowledge/:id', async (req, res) => {
    const node = await graph.generateKnowledge(req.params.id);
    if (!node) {
      res.status(404).json({ error: `Node not found: ${req.params.id}` });
      return;
    }
    res.json({ knowledge: node.knowledge });
  });

  router.post('/chat', async (req, res) => {
    const question = (req.body as { question?: string }).question;
    if (!question) {
      res.status(400).json({ error: 'question is required' });
      return;
    }
    const result = await graph.askCodebase(question);
    res.json(result);
  });

  return router;
};
