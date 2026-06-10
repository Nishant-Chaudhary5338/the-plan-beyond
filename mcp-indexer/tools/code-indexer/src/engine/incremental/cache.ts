import * as fs from 'fs';
import * as path from 'path';
import { GraphSnapshot } from '@repo/code-graph-core';

const CACHE_DIR = '.code-graph';
const GRAPH_FILE = 'graph.json';

export const cacheDir = (root: string): string => path.join(root, CACHE_DIR);

export const graphPath = (root: string): string =>
  path.join(cacheDir(root), GRAPH_FILE);

export const writeSnapshot = (root: string, snapshot: GraphSnapshot): string => {
  const dir = cacheDir(root);
  fs.mkdirSync(dir, { recursive: true });
  const target = graphPath(root);
  fs.writeFileSync(target, JSON.stringify(snapshot, null, 2), 'utf-8');
  return target;
};

export const readSnapshot = (root: string): GraphSnapshot | null => {
  const target = graphPath(root);
  if (!fs.existsSync(target)) return null;
  const raw = JSON.parse(fs.readFileSync(target, 'utf-8')) as unknown;
  return GraphSnapshot.parse(raw);
};
