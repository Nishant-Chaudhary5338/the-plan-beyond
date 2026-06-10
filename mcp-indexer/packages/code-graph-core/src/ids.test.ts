import { describe, it, expect } from 'vitest';
import {
  fileId,
  componentId,
  functionId,
  packageId,
  edgeId,
} from './ids';

describe('canonical ids', () => {
  it('normalizes windows separators in file ids', () => {
    expect(fileId('apps\\web\\code-graph\\src\\App.tsx')).toBe(
      'file:apps/web/code-graph/src/App.tsx',
    );
  });

  it('produces deterministic component ids', () => {
    const a = componentId('src/Button.tsx', 'Button');
    const b = componentId('src/Button.tsx', 'Button');
    expect(a).toBe(b);
    expect(a).toBe('cmp:src/Button.tsx#Button');
  });

  it('encodes start line into function ids for disambiguation', () => {
    expect(functionId('src/util.ts', 'parse', 42)).toBe(
      'fn:src/util.ts#parse@42',
    );
  });

  it('builds edge ids from source, target and type', () => {
    expect(edgeId(packageId('@repo/ui'), packageId('@repo/utils'), 'depends-on')).toBe(
      'pkg:@repo/ui->pkg:@repo/utils:depends-on',
    );
  });
});
