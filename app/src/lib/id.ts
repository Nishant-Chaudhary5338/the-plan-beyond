/** Generate a unique id, preferring crypto.randomUUID with a safe fallback. */
export function genId(prefix = 'id'): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.round(performance.now())}`;
}
