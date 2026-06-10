import type { GraphSnapshot } from '@repo/code-graph-core';
import { repoId } from '@repo/code-graph-core';
import type { IndexerConfig } from '../config.js';
import { IndexerSession } from './session.js';

export { IndexerSession } from './session.js';

export type IndexResult = {
  snapshot: GraphSnapshot;
  durationMs: number;
};

export const runFullIndex = (config: IndexerConfig): IndexResult => {
  const startedAt = Date.now();
  const session = new IndexerSession(config.root, config);
  const snapshot = session.indexFull();
  return { snapshot, durationMs: Date.now() - startedAt };
};

export const repoNodeId = (rootName: string): string => repoId(rootName);
