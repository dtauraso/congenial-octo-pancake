// Step-function substrate: a node has slots, a step() method, and
// nothing else. step() is a no-op unless internal conditions hold
// (gate ready, inputs present, downstream slot free). All nodes tick
// on the same beat; ordering emerges from wiring, not from a
// scheduler.

export type Slot<T> = { value: T | undefined };

export function makeSlot<T>(): Slot<T> { return { value: undefined }; }
export function isFull<T>(s: Slot<T>): boolean { return s.value !== undefined; }
export function take<T>(s: Slot<T>): T | undefined {
  const v = s.value;
  s.value = undefined;
  return v;
}
export function put<T>(s: Slot<T>, v: T): boolean {
  if (s.value !== undefined) return false;
  s.value = v;
  return true;
}

export interface StepNode {
  id: string;
  step(): void;
}
