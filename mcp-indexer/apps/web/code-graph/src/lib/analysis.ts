import type { GraphEdge } from '@repo/code-graph-core';

// A node "depends on" what it imports, calls, renders, or type-references — so a
// change to the target can ripple back to the source. `contains` is structural
// (tree containment), not a dependency, so it is excluded.
const DEPENDENCY_TYPES = new Set<GraphEdge['type']>([
  'imports',
  'depends-on',
  'calls',
  'renders',
  'references',
]);

const buildReverseAdjacency = (
  edges: GraphEdge[],
): Map<string, string[]> => {
  const reverse = new Map<string, string[]>();
  for (const edge of edges) {
    if (!DEPENDENCY_TYPES.has(edge.type)) continue;
    const dependents = reverse.get(edge.target) ?? [];
    dependents.push(edge.source);
    reverse.set(edge.target, dependents);
  }
  return reverse;
};

// Everything that (transitively) depends on `nodeId` — the blast radius if it
// breaks or changes.
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

// Tarjan-free cycle detection over dependency edges: returns the distinct
// cycles found (each as an ordered list of node ids).
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
