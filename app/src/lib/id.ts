let counter = 0;

/** Random hex via crypto.getRandomValues, or Math.random as a last resort. */
function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  const c = globalThis.crypto;
  if (c?.getRandomValues) {
    c.getRandomValues(buf);
  } else {
    for (let i = 0; i < bytes; i += 1) buf[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a unique id. Prefers `crypto.randomUUID`; the fallback combines a
 * process-lifetime monotonic counter with random bytes so it stays unique even
 * inside a tight synchronous loop (e.g. importing many contacts at once) in
 * non-secure contexts where `randomUUID` is unavailable.
 */
export function genId(prefix = 'id'): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  counter += 1;
  return `${prefix}-${counter.toString(36)}-${randomHex(8)}`;
}
