import {
  whoRenders,
  whoCalls,
  findReferences,
  blastRadius,
  findCycles,
  projectGraph,
  summarizeSnapshot,
  nodePath,
  DEFAULT_FULL_NODE_THRESHOLD,
  EdgeType,
  type GraphSnapshot,
  type GraphNode,
  type GraphEdge,
  type NodeType,
  type ProjectionOptions,
  type GraphSummary,
  type ProjectedGraph,
} from '@repo/code-graph-core';
import { readSnapshot } from './engine/incremental/cache.js';

/**
 * Engine-level query facade. Loads the persisted snapshot once and runs the
 * shared core analyses over it, enriching bare edge/id results with the human
 * fields (name/type/path) an agent or a CLI user actually needs. Both the MCP
 * server and the CLI delegate here so the query logic lives in exactly one place.
 */

const loadSnapshot = (root: string): GraphSnapshot => {
  const snapshot = readSnapshot(root);
  if (!snapshot) {
    throw new Error(`No graph found for ${root}. Run index_repo / "index" first.`);
  }
  return snapshot;
};

const nodeMap = (snapshot: GraphSnapshot): Map<string, GraphNode> =>
  new Map(snapshot.nodes.map((n) => [n.id, n] as const));

const assertNode = (snapshot: GraphSnapshot, id: string): void => {
  if (!snapshot.nodes.some((n) => n.id === id)) {
    throw new Error(`Node not found: ${id}`);
  }
};

/** A reference into a node: the SOURCE of an incoming edge, enriched. */
export interface RefResult {
  id: string;
  name: string;
  type: NodeType;
  path: string | null;
  weight: number;
  edgeType: GraphEdge['type'];
}

const enrichIncoming = (
  snapshot: GraphSnapshot,
  edges: GraphEdge[],
): RefResult[] => {
  const map = nodeMap(snapshot);
  const out: RefResult[] = [];
  for (const e of edges) {
    const n = map.get(e.source);
    if (!n) continue; // engine guarantees indexed endpoints; skip if absent
    out.push({
      id: n.id,
      name: n.name,
      type: n.type,
      path: nodePath(n),
      weight: e.weight,
      edgeType: e.type,
    });
  }
  return out;
};

export interface RefQueryResult {
  id: string;
  count: number;
  results: RefResult[];
}

export const queryWhoRenders = (root: string, id: string): RefQueryResult => {
  const snapshot = loadSnapshot(root);
  assertNode(snapshot, id);
  const results = enrichIncoming(snapshot, whoRenders(snapshot.edges, id));
  return { id, count: results.length, results };
};

export const queryWhoCalls = (root: string, id: string): RefQueryResult => {
  const snapshot = loadSnapshot(root);
  assertNode(snapshot, id);
  const results = enrichIncoming(snapshot, whoCalls(snapshot.edges, id));
  return { id, count: results.length, results };
};

export const queryFindReferences = (
  root: string,
  id: string,
  types?: string[],
): RefQueryResult => {
  const snapshot = loadSnapshot(root);
  assertNode(snapshot, id);
  const valid = new Set(EdgeType.options);
  const typeSet =
    types && types.length > 0
      ? new Set(types.filter((t): t is GraphEdge['type'] => valid.has(t as GraphEdge['type'])))
      : undefined;
  const results = enrichIncoming(
    snapshot,
    findReferences(snapshot.edges, id, typeSet),
  );
  return { id, count: results.length, results };
};

export interface ImpactedNode {
  id: string;
  name: string;
  type: NodeType;
  path: string | null;
}

export interface BlastRadiusResult {
  id: string;
  count: number;
  impacted: ImpactedNode[];
}

export const queryBlastRadius = (root: string, id: string): BlastRadiusResult => {
  const snapshot = loadSnapshot(root);
  assertNode(snapshot, id);
  const map = nodeMap(snapshot);
  const impacted: ImpactedNode[] = [];
  for (const nid of blastRadius(snapshot.edges, id)) {
    const n = map.get(nid);
    if (n) impacted.push({ id: n.id, name: n.name, type: n.type, path: nodePath(n) });
  }
  return { id, count: impacted.length, impacted };
};

export interface CyclesResult {
  count: number;
  cycles: Array<Array<{ id: string; name: string; type: NodeType }>>;
}

export const queryFindCycles = (root: string): CyclesResult => {
  const snapshot = loadSnapshot(root);
  const map = nodeMap(snapshot);
  const cycles = findCycles(snapshot.edges).map((cycle) => {
    const enriched: Array<{ id: string; name: string; type: NodeType }> = [];
    for (const nid of cycle) {
      const n = map.get(nid);
      if (n) enriched.push({ id: n.id, name: n.name, type: n.type });
    }
    return enriched;
  });
  return { count: cycles.length, cycles };
};

export type GraphQueryOptions = ProjectionOptions & { full?: boolean };

/**
 * Token-safe graph read. With explicit projection options, applies them. With
 * NO options on a large graph, defaults to a summary (and signals it) so an agent
 * never gets the whole node list dumped into its context; `full:true` overrides.
 */
export const queryGraph = (
  root: string,
  opts: GraphQueryOptions = {},
): GraphSummary | ProjectedGraph | (GraphSummary & { _hint: string }) => {
  const snapshot = loadSnapshot(root);
  const hasProjection =
    opts.summary ||
    opts.type !== undefined ||
    opts.depth !== undefined ||
    opts.lean ||
    (opts.fields !== undefined && opts.fields.length > 0);

  if (!hasProjection && !opts.full && snapshot.nodes.length > DEFAULT_FULL_NODE_THRESHOLD) {
    return {
      ...summarizeSnapshot(snapshot),
      _hint:
        `Large graph (${snapshot.nodes.length} nodes) — returned a summary. ` +
        `Add full:true for everything, or narrow with type/depth/lean/fields.`,
    };
  }
  return projectGraph(snapshot, opts);
};
