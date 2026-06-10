import { describe, it, expect, vi, afterEach } from 'vitest';
import { genId } from './id';

afterEach(() => vi.unstubAllGlobals());

describe('genId', () => {
  it('uses crypto.randomUUID when available', () => {
    const id = genId('contact');
    // Default jsdom/node provides a real UUID.
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('stays unique in a tight synchronous loop even without randomUUID', () => {
    // Simulate a non-secure context: no randomUUID, but getRandomValues present.
    const realCrypto = globalThis.crypto;
    vi.stubGlobal('crypto', {
      getRandomValues: realCrypto.getRandomValues.bind(realCrypto),
    });

    const ids = new Set<string>();
    for (let i = 0; i < 5000; i += 1) ids.add(genId('phone'));
    expect(ids.size).toBe(5000);
    for (const id of ids) expect(id.startsWith('phone-')).toBe(true);
  });

  it('still produces unique ids with neither randomUUID nor getRandomValues', () => {
    vi.stubGlobal('crypto', {});
    const ids = new Set<string>();
    for (let i = 0; i < 2000; i += 1) ids.add(genId('tmp'));
    expect(ids.size).toBe(2000);
  });
});
