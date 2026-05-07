// Node-agnostic readiness registry. The single seam through which
// mutation sites consult node-owned state. Knows nothing about any
// specific node-class. Not a scheduler.

type Predicate = () => boolean;

const predicates = new Map<string, Predicate>();

export function register(nodeId: string, predicate: Predicate): void {
  predicates.set(nodeId, predicate);
}

export function unregister(nodeId: string): void {
  predicates.delete(nodeId);
}

export function ready(nodeId: string): boolean {
  const p = predicates.get(nodeId);
  return p ? p() : true;
}

export function clear(): void {
  predicates.clear();
}
