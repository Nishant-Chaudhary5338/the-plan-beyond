/**
 * Structural deep equality for plain JSON-like data (primitives, arrays, plain
 * objects). Unlike `JSON.stringify` comparison it is insensitive to key order
 * and treats a missing key and an `undefined` value as equal — which is exactly
 * what we want for diffing a form draft against its server copy.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;

  const aArray = Array.isArray(a);
  const bArray = Array.isArray(b);
  if (aArray !== bArray) return false;

  if (aArray && bArray) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }

  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  // Only keys whose value isn't `undefined` count, so { x: undefined } === {}.
  const keys = (o: Record<string, unknown>) => Object.keys(o).filter((k) => o[k] !== undefined);
  const aKeys = keys(ao);
  const bKeys = keys(bo);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => Object.prototype.hasOwnProperty.call(bo, k) && deepEqual(ao[k], bo[k]));
}
