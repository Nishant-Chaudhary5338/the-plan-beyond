import { Router } from 'express';
import {
  whoRenders,
  whoCalls,
  findReferences,
  blastRadius,
  findCycles,
  nodePath,
  EdgeType,
  type GraphEdge,
  type GraphNode,
} from '@repo/code-graph-core';
import type { GraphService } from '../graph-service.js';

/** The valid edge-type values, for filtering the `?types=` query param. */
const EDGE_TYPES = new Set<string>(EdgeType.options);

/**
 * Identity + location facts for a node, the shape every enriched query result
 * shares. `path` is the node's source path when it has one (`nodePath`), else null.
 */
interface NodeRef {
  id: string;
  name: string;
  type: GraphNode['type'];
  path: string | null;
}

/** Look up a node by id and project it to a {@link NodeRef}, or null if absent. */
const toNodeRef = (byId: Map<string, GraphNode>, id: string): NodeRef | null => {
  const node = byId.get(id);
  if (!node) return null;
  return { id: node.id, name: node.name, type: node.type, path: nodePath(node) };
};

/**
 * Enrich one incoming edge into its SOURCE node's facts plus the edge weight.
 * Returns null when the source node is missing from the snapshot (so callers can
 * filter dangling edges out).
 */
const enrichSource = (
  byId: Map<string, GraphNode>,
  edge: GraphEdge,
): (NodeRef & { weight: number }) | null => {
  const ref = toNodeRef(byId, edge.source);
  if (!ref) return null;
  return { ...ref, weight: edge.weight };
};

/** Parse `?types=renders,calls` into a validated set of EdgeType, or undefined. */
const parseEdgeTypes = (raw: unknown): ReadonlySet<EdgeType> | undefined => {
  if (typeof raw !== 'string' || raw.trim().length === 0) return undefined;
  const valid = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is EdgeType => EDGE_TYPES.has(s));
  return valid.length > 0 ? new Set<EdgeType>(valid) : undefined;
};

/**
 * Reverse-lookup / impact-analysis routes over the live snapshot. Every route
 * answers from `snapshot.edges` + `snapshot.nodes` alone (no symbol table), so
 * they are cheap and depend only on the already-built graph.
 *
 * Each request builds a `Map<id, node>` once for O(1) enrichment, returns 503
 * when the graph isn't indexed yet, and 404 when an `:id` node is unknown.
 */
export const queryRouter = (graph: GraphService): Router => {
  const router = Router();

  /** Incoming `renders` edges of `:id`, enriched with each source component. */
  router.get('/who-renders/:id', (req, res) => {
    const snapshot = graph.getSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'Graph not indexed yet' });
      return;
    }
    const id = req.params.id;
    const byId = new Map(snapshot.nodes.map((n) => [n.id, n] as const));
    if (!byId.has(id)) {
      res.status(404).json({ error: `Node not found: ${id}` });
      return;
    }
    const results = whoRenders(snapshot.edges, id)
      .map((edge) => enrichSource(byId, edge))
      .filter((r): r is NodeRef & { weight: number } => r !== null);
    res.json({ id, results });
  });

  /** Incoming `calls` edges of `:id`, enriched with each calling symbol. */
  router.get('/who-calls/:id', (req, res) => {
    const snapshot = graph.getSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'Graph not indexed yet' });
      return;
    }
    const id = req.params.id;
    const byId = new Map(snapshot.nodes.map((n) => [n.id, n] as const));
    if (!byId.has(id)) {
      res.status(404).json({ error: `Node not found: ${id}` });
      return;
    }
    const results = whoCalls(snapshot.edges, id)
      .map((edge) => enrichSource(byId, edge))
      .filter((r): r is NodeRef & { weight: number } => r !== null);
    res.json({ id, results });
  });

  /**
   * Every reference *into* `:id`, optionally narrowed by `?types=renders,calls`.
   * Each result also carries the originating `edge.type`.
   */
  router.get('/references/:id', (req, res) => {
    const snapshot = graph.getSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'Graph not indexed yet' });
      return;
    }
    const id = req.params.id;
    const byId = new Map(snapshot.nodes.map((n) => [n.id, n] as const));
    if (!byId.has(id)) {
      res.status(404).json({ error: `Node not found: ${id}` });
      return;
    }
    const types = parseEdgeTypes(req.query.types);
    const results = findReferences(snapshot.edges, id, types)
      .map((edge) => {
        const enriched = enrichSource(byId, edge);
        return enriched ? { ...enriched, edgeType: edge.type } : null;
      })
      .filter((r): r is NodeRef & { weight: number; edgeType: EdgeType } => r !== null);
    res.json({ id, results });
  });

  /** Everything that transitively depends on `:id` — its blast radius. */
  router.get('/blast-radius/:id', (req, res) => {
    const snapshot = graph.getSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'Graph not indexed yet' });
      return;
    }
    const id = req.params.id;
    const byId = new Map(snapshot.nodes.map((n) => [n.id, n] as const));
    if (!byId.has(id)) {
      res.status(404).json({ error: `Node not found: ${id}` });
      return;
    }
    const impacted: NodeRef[] = [];
    for (const impactedId of blastRadius(snapshot.edges, id)) {
      const ref = toNodeRef(byId, impactedId);
      if (ref) impacted.push(ref);
    }
    res.json({ id, count: impacted.length, impacted });
  });

  /** All dependency cycles in the graph, each as an ordered list of node refs. */
  router.get('/cycles', (_req, res) => {
    const snapshot = graph.getSnapshot();
    if (!snapshot) {
      res.status(503).json({ error: 'Graph not indexed yet' });
      return;
    }
    const byId = new Map(snapshot.nodes.map((n) => [n.id, n] as const));
    const cycles = findCycles(snapshot.edges).map((cycle) =>
      cycle
        .map((cid) => {
          const node = byId.get(cid);
          return node ? { id: node.id, name: node.name, type: node.type } : null;
        })
        .filter(
          (n): n is { id: string; name: string; type: GraphNode['type'] } => n !== null,
        ),
    );
    res.json({ count: cycles.length, cycles });
  });

  return router;
};
