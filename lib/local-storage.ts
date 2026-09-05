// Process-local metadata is exclusively for disposable local-chain development.
const storeKey = Symbol.for('proofline.local-metadata');
const holder = globalThis as unknown as Record<symbol, Map<string, Uint8Array>>;
export function localStore() {
  return holder[storeKey] ?? (holder[storeKey] = new Map());
}
