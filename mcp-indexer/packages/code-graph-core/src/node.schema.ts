import { z } from 'zod';
import { NodeStatus } from './status.schema';
import { NodeKnowledge, GitMeta } from './knowledge.schema';

export const NodeType = z.enum([
  'repo',
  'app',
  'package',
  'folder',
  'file',
  'component',
  'function',
]);
export type NodeType = z.infer<typeof NodeType>;

export const SourceSpan = z.object({
  startLine: z.number().int().nonnegative(),
  endLine: z.number().int().nonnegative(),
});
export type SourceSpan = z.infer<typeof SourceSpan>;

export const NodeMetrics = z.object({
  loc: z.number().int().nonnegative(),
  exportsCount: z.number().int().nonnegative(),
});
export type NodeMetrics = z.infer<typeof NodeMetrics>;

export const GraphNode = z.object({
  id: z.string(),
  type: NodeType,
  name: z.string(),
  path: z.string().nullable(),
  parentId: z.string().nullable(),
  span: SourceSpan.nullable(),
  contentHash: z.string().nullable(),
  status: NodeStatus,
  knowledge: NodeKnowledge.nullable(),
  git: GitMeta.nullable(),
  bundleBytes: z.number().int().nonnegative().nullable(),
  metrics: NodeMetrics,
});
export type GraphNode = z.infer<typeof GraphNode>;
