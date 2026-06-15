import type {
  GraphSnapshot,
  GraphNode,
  GraphEdge,
  NodeType,
} from '@repo/code-graph-core';

export type GraphIndex = {
  nodeById: Map<string, GraphNode>;
  childrenOf: Map<string, GraphNode[]>;
  crossEdges: GraphEdge[];
};

export type VisibleLink = {
  id: string;
  source: string;
  target: string;
  type: GraphEdge['type'];
  weight: number;
};

export type VisibleGraph = {
  nodes: GraphNode[];
  links: VisibleLink[];
  expandable: Set<string>;
};

export const buildIndex = (snapshot: GraphSnapshot): GraphIndex => {
  const nodeById = new Map<string, GraphNode>();
  const childrenOf = new Map<string, GraphNode[]>();
  const crossEdges: GraphEdge[] = [];

  for (const node of snapshot.nodes) nodeById.set(node.id, node);

  for (const edge of snapshot.edges) {
    if (edge.type === 'contains') {
      const child = nodeById.get(edge.target);
      if (!child) continue;
      const list = childrenOf.get(edge.source) ?? [];
      list.push(child);
      childrenOf.set(edge.source, list);
    } else {
      crossEdges.push(edge);
    }
  }

  return { nodeById, childrenOf, crossEdges };
};

export const rootId = (snapshot: GraphSnapshot): string | null =>
  snapshot.nodes.find((n) => n.type === 'repo')?.id ?? null;

export const pathToRoot = (
  index: GraphIndex,
  nodeId: string,
): GraphNode[] => {
  const path: GraphNode[] = [];
  let current: GraphNode | undefined = index.nodeById.get(nodeId);
  while (current) {
    path.unshift(current);
    current = current.parentId
      ? index.nodeById.get(current.parentId)
      : undefined;
  }
  return path;
};

export const visibleGraph = (
  index: GraphIndex,
  focusId: string,
): VisibleGraph => {
  const children = index.childrenOf.get(focusId) ?? [];
  const visibleIds = new Set(children.map((n) => n.id));
  const expandable = new Set<string>();

  for (const child of children) {
    if ((index.childrenOf.get(child.id)?.length ?? 0) > 0) {
      expandable.add(child.id);
    }
  }

  const links: VisibleLink[] = index.crossEdges
    .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      weight: e.weight,
    }));

  return { nodes: children, links, expandable };
};

export const TYPE_LABEL: Record<NodeType, string> = {
  repo: 'Repository',
  app: 'App',
  package: 'Package',
  folder: 'Folder',
  file: 'File',
  component: 'Component',
  function: 'Function',
  external: 'External',
};

export const EDGE_LABEL: Record<GraphEdge['type'], string> = {
  contains: 'Contains',
  imports: 'Imports',
  'depends-on': 'Depends on',
  calls: 'Calls',
  renders: 'Renders',
  references: 'References',
};
