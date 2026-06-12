import type { GraphEdge, EdgeType } from './edge.schema';

/**
 * Edge types that represent a real **dependency** — a change to the target can
 * ripple back to the source. `contains` is structural tree containment (a folder
 * "contains" a file), not a dependency, so it is excluded from blast-radius and
 * cycle analysis. This is the same rule the web viewer used; it now lives in the
 * contract so the engine, server, MCP tools, and UI share one definition.
 */
export const DEPENDENCY_TYPES: ReadonlySet<EdgeType> = new Set<EdgeType>([
  'imports',
  'depends-on',
  'calls',
  'renders',
  'references',
]);

/**
 * Group edges by their **target** id (incoming edges), optionally filtered to a
 * set of edge types. This is the foundation for every reverse-lookup query
 * ("who renders / calls / references X") — they are all just the incoming edges
 * of a node, resolvable from `snapshot.edges` alone with no symbol table.
 */
export const buildReverseIndex = (
  edges: GraphEdge[],
  types?: ReadonlySet<EdgeType>,
): Map<string, GraphEdge[]> => {
  const reverse = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    if (types && !types.has(edge.type)) continue;
    const list = reverse.get(edge.target);
    if (list) list.push(edge);
    else reverse.set(edge.target, [edge]);
  }
  return reverse;
};

/** Group edges by their **source** id (outgoing edges), optionally filtered. */
export const buildForwardIndex = (
  edges: GraphEdge[],
  types?: ReadonlySet<EdgeType>,
): Map<string, GraphEdge[]> => {
  const forward = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    if (types && !types.has(edge.type)) continue;
    const list = forward.get(edge.source);
    if (list) list.push(edge);
    else forward.set(edge.source, [edge]);
  }
  return forward;
};

const incomingOfType = (
  edges: GraphEdge[],
  nodeId: string,
  type: EdgeType,
): GraphEdge[] => edges.filter((e) => e.target === nodeId && e.type === type);

/** Components that render `componentId` — the incoming `renders` edges. */
export const whoRenders = (
  edges: GraphEdge[],
  componentId: string,
): GraphEdge[] => incomingOfType(edges, componentId, 'renders');

/** Symbols that call `symbolId` — the incoming `calls` edges. */
export const whoCalls = (edges: GraphEdge[], symbolId: string): GraphEdge[] =>
  incomingOfType(edges, symbolId, 'calls');

/**
 * Every reference *into* `nodeId` — the incoming edges, filtered to `types`
 * (defaults to all dependency types). The generic "find all references" query.
 */
export const findReferences = (
  edges: GraphEdge[],
  nodeId: string,
  types: ReadonlySet<EdgeType> = DEPENDENCY_TYPES,
): GraphEdge[] => edges.filter((e) => e.target === nodeId && types.has(e.type));

// `target -> [source...]` over dependency edges only — the adjacency blast-radius
// walks. Kept private; blast-radius is the public surface.
const buildReverseAdjacency = (edges: GraphEdge[]): Map<string, string[]> => {
  const reverse = new Map<string, string[]>();
  for (const edge of edges) {
    if (!DEPENDENCY_TYPES.has(edge.type)) continue;
    const dependents = reverse.get(edge.target) ?? [];
    dependents.push(edge.source);
    reverse.set(edge.target, dependents);
  }
  return reverse;
};

/**
 * Everything that (transitively) depends on `nodeId` — the blast radius if it
 * breaks or changes. Walks dependency edges in reverse from `nodeId`.
 */
export const blastRadius = (
  edges: GraphEdge[],
  nodeId: string,
): Set<string> => {
  const reverse = buildReverseAdjacency(edges);
  const impacted = new Set<string>();
  const stack = [nodeId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    for (const dependent of reverse.get(current) ?? []) {
      if (!impacted.has(dependent)) {
        impacted.add(dependent);
        stack.push(dependent);
      }
    }
  }
  return impacted;
};

/**
 * DFS cycle detection over dependency edges: returns the distinct cycles found
 * (each as an ordered list of node ids). Used for the "X cycles" health signal.
 */
export const findCycles = (edges: GraphEdge[]): string[][] => {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!DEPENDENCY_TYPES.has(edge.type)) continue;
    const next = adjacency.get(edge.source) ?? [];
    next.push(edge.target);
    adjacency.set(edge.source, next);
  }

  const cycles: string[][] = [];
  const seen = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  const visit = (node: string): void => {
    inStack.add(node);
    path.push(node);
    for (const next of adjacency.get(node) ?? []) {
      if (inStack.has(next)) {
        const start = path.indexOf(next);
        if (start !== -1) cycles.push(path.slice(start));
      } else if (!seen.has(next)) {
        visit(next);
      }
    }
    inStack.delete(node);
    path.pop();
    seen.add(node);
  };

  for (const node of adjacency.keys()) {
    if (!seen.has(node)) visit(node);
  }
  return cycles;
};
