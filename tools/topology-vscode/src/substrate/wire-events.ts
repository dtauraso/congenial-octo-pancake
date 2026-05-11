// Event types and ordinal sequence numbers for wire state changes.
// Sequence numbers are pure ordinals (not durations); see MODEL.md.

export type WireEventKind = "loaded" | "arrived" | "taken" | "acked";

export interface WireEvent {
  readonly seq: number;
  readonly wireId: string;
  readonly kind: WireEventKind;
}

let counter = 0;
export function nextSeq(): number {
  return ++counter;
}

// Test-only: reset the global ordinal so per-test event sequences
// stay easy to read. Production code must not call this.
export function _resetSeqForTests(): void {
  counter = 0;
}
