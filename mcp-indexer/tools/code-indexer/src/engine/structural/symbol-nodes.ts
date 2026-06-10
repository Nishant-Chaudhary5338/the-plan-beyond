import {
  Node,
  SourceFile,
  VariableDeclaration,
  FunctionDeclaration,
} from 'ts-morph';
import type { GraphNode, GraphEdge } from '@repo/code-graph-core';
import {
  componentId,
  functionId,
  fileId,
  edgeId,
  emptyStatus,
} from '@repo/code-graph-core';
import { classifySymbol } from './detect-components.js';

type SymbolResult = { nodes: GraphNode[]; edges: GraphEdge[] };

const makeSymbolNode = (
  relPath: string,
  fileNodeId: string,
  name: string,
  body: Node,
  isTsx: boolean,
): { node: GraphNode; edge: GraphEdge } => {
  const startLine = body.getStartLineNumber();
  const endLine = body.getEndLineNumber();
  const kind = classifySymbol(name, body, isTsx);
  const id =
    kind === 'component'
      ? componentId(relPath, name)
      : functionId(relPath, name, startLine);

  const node: GraphNode = {
    id,
    type: kind,
    name,
    path: relPath,
    parentId: fileNodeId,
    span: { startLine, endLine },
    contentHash: null,
    status: emptyStatus(),
    knowledge: null,
    git: null,
    bundleBytes: null,
    metrics: { loc: endLine - startLine + 1, exportsCount: 0 },
  };
  return { node, edge: containsEdge(fileNodeId, id) };
};

const containsEdge = (parent: string, child: string): GraphEdge => ({
  id: edgeId(parent, child, 'contains'),
  source: parent,
  target: child,
  type: 'contains',
  weight: 1,
});

const isExported = (decl: FunctionDeclaration | VariableDeclaration): boolean => {
  if (Node.isFunctionDeclaration(decl)) return decl.isExported();
  const statement = decl.getVariableStatement();
  return statement?.isExported() ?? false;
};

export const extractSymbolNodes = (
  source: SourceFile,
  relPath: string,
): SymbolResult => {
  const fileNodeId = fileId(relPath);
  const isTsx = relPath.endsWith('.tsx');
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const fn of source.getFunctions()) {
    const name = fn.getName();
    if (!name || !isExported(fn)) continue;
    const { node, edge } = makeSymbolNode(relPath, fileNodeId, name, fn, isTsx);
    nodes.push(node);
    edges.push(edge);
  }

  for (const decl of source.getVariableDeclarations()) {
    if (!isExported(decl)) continue;
    const initializer = decl.getInitializer();
    if (!initializer) continue;
    if (
      !Node.isArrowFunction(initializer) &&
      !Node.isFunctionExpression(initializer)
    ) {
      continue;
    }
    const name = decl.getName();
    const { node, edge } = makeSymbolNode(
      relPath,
      fileNodeId,
      name,
      initializer,
      isTsx,
    );
    nodes.push(node);
    edges.push(edge);
  }

  return { nodes, edges };
};
