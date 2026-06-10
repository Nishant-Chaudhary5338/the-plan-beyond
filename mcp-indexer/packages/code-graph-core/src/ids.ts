import type { EdgeType } from './edge.schema';

const normalizePath = (relPath: string): string => relPath.replace(/\\/g, '/');

export const repoId = (rootName: string): string => `repo:${rootName}`;

export const appId = (pkgName: string): string => `app:${pkgName}`;

export const packageId = (pkgName: string): string => `pkg:${pkgName}`;

export const folderId = (relPath: string): string =>
  `dir:${normalizePath(relPath)}`;

export const fileId = (relPath: string): string =>
  `file:${normalizePath(relPath)}`;

export const componentId = (relPath: string, exportName: string): string =>
  `cmp:${normalizePath(relPath)}#${exportName}`;

export const functionId = (
  relPath: string,
  symbol: string,
  startLine: number,
): string => `fn:${normalizePath(relPath)}#${symbol}@${startLine}`;

export const edgeId = (
  source: string,
  target: string,
  type: EdgeType,
): string => `${source}->${target}:${type}`;
