import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { isPascalCase, returnsJsx } from './detect-components.js';

describe('isPascalCase', () => {
  it('accepts PascalCase identifiers', () => {
    expect(isPascalCase('Button')).toBe(true);
    expect(isPascalCase('UserCard')).toBe(true);
  });

  it('rejects camelCase and helpers', () => {
    expect(isPascalCase('useStore')).toBe(false);
    expect(isPascalCase('parseInput')).toBe(false);
    expect(isPascalCase('_private')).toBe(false);
  });
});

describe('returnsJsx', () => {
  const project = new Project({ useInMemoryFileSystem: true });

  it('detects a function returning JSX', () => {
    const sf = project.createSourceFile(
      'a.tsx',
      'export const Card = () => <div>hi</div>;',
    );
    const decl = sf.getVariableDeclarationOrThrow('Card');
    const init = decl.getInitializerOrThrow();
    expect(returnsJsx(init)).toBe(true);
  });

  it('returns false for a plain helper', () => {
    const sf = project.createSourceFile(
      'b.ts',
      'export const add = (a: number, b: number) => a + b;',
    );
    const decl = sf.getVariableDeclarationOrThrow('add');
    const init = decl.getInitializerOrThrow();
    expect(returnsJsx(init)).toBe(false);
  });
});
