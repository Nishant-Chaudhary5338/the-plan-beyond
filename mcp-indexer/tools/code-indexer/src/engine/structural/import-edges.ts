import * as path from 'path';
import { SourceFile } from 'ts-morph';
import type { GraphEdge } from '@repo/code-graph-core';
import { fileId, edgeId } from '@repo/code-graph-core';

export const extractImportEdges = (
  source: SourceFile,
  relPath: string,
  root: string,
): GraphEdge[] => {
  const sourceId = fileId(relPath);
  const weights = new Map<string, number>();

  for (const decl of source.getImportDeclarations()) {
    const target = decl.getModuleSpecifierSourceFile();
    if (!target) continue;
    const targetAbs = target.getFilePath();
    if (targetAbs.includes('node_modules')) continue;
    const targetRel = path.relative(root, targetAbs);
    if (targetRel.startsWith('..')) continue;
    const targetId = fileId(targetRel);
    if (targetId === sourceId) continue;
    weights.set(targetId, (weights.get(targetId) ?? 0) + 1);
  }

  return [...weights.entries()].map(([targetId, weight]) => ({
    id: edgeId(sourceId, targetId, 'imports'),
    source: sourceId,
    target: targetId,
    type: 'imports' as const,
    weight,
  }));
};
