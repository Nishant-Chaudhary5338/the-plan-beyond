import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { extractImportEdges } from './import-edges.js';
import type { GraphEdge } from '@repo/code-graph-core';

// Build an in-memory project rooted at /repo with the given files, then extract
// edges for `entry`.
const edgesFor = (
  files: Record<string, string>,
  entry: string,
): GraphEdge[] => {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { jsx: 4 },
  });
  for (const [name, content] of Object.entries(files)) {
    project.createSourceFile(`/repo/${name}`, content, { overwrite: true });
  }
  const sf = project.getSourceFileOrThrow(`/repo/${entry}`);
  return extractImportEdges(sf, entry, '/repo');
};

describe('extractImportEdges', () => {
  it('emits an imports edge for a static import', () => {
    const edges = edgesFor(
      {
        'a.ts': `import { b } from './b';\nexport const x = b;`,
        'b.ts': `export const b = 1;`,
      },
      'a.ts',
    );
    const imp = edges.find((e) => e.type === 'imports');
    expect(imp?.target).toBe('file:b.ts');
  });

  it('emits an imports edge for a re-export barrel', () => {
    const edges = edgesFor(
      {
        'index.ts': `export { b } from './b';\nexport * from './c';`,
        'b.ts': `export const b = 1;`,
        'c.ts': `export const c = 2;`,
      },
      'index.ts',
    );
    const targets = edges
      .filter((e) => e.type === 'imports')
      .map((e) => e.target)
      .sort();
    expect(targets).toEqual(['file:b.ts', 'file:c.ts']);
  });

  it('emits an imports edge for a dynamic import()', () => {
    const edges = edgesFor(
      {
        'a.ts': `export const load = () => import('./b');`,
        'b.ts': `export const b = 1;`,
      },
      'a.ts',
    );
    const imp = edges.find((e) => e.type === 'imports');
    expect(imp?.target).toBe('file:b.ts');
  });

  it('tags type-only imports as references, not imports', () => {
    const edges = edgesFor(
      {
        'a.ts': `import type { T } from './b';\nexport const x: T = 1 as T;`,
        'b.ts': `export type T = number;`,
      },
      'a.ts',
    );
    expect(edges.find((e) => e.type === 'imports')).toBeUndefined();
    const ref = edges.find((e) => e.type === 'references');
    expect(ref?.target).toBe('file:b.ts');
  });

  it('tags type-only re-exports as references', () => {
    const edges = edgesFor(
      {
        'index.ts': `export type { T } from './b';`,
        'b.ts': `export type T = number;`,
      },
      'index.ts',
    );
    expect(edges.find((e) => e.type === 'imports')).toBeUndefined();
    expect(edges.find((e) => e.type === 'references')?.target).toBe('file:b.ts');
  });

  it('ignores node_modules and out-of-root targets', () => {
    const edges = edgesFor(
      {
        'a.ts': `import { x } from 'some-pkg';\nimport './b';`,
        'b.ts': `export const b = 1;`,
      },
      'a.ts',
    );
    // `some-pkg` is unresolved (no node_modules) -> no edge; only ./b counts.
    expect(edges.every((e) => e.target === 'file:b.ts')).toBe(true);
  });

  it('accumulates weight for repeated imports of the same module', () => {
    const edges = edgesFor(
      {
        'a.ts': `import { b } from './b';\nexport const load = () => import('./b');`,
        'b.ts': `export const b = 1;`,
      },
      'a.ts',
    );
    const imp = edges.find((e) => e.type === 'imports');
    expect(imp?.weight).toBe(2);
  });
});
