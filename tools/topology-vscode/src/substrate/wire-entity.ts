// Wire as a first-class entity. State is exactly `empty | carrying(v)`.
// No queue, no buffer, no length, no timing fields. See MODEL.md.
//
// `carry(v)` on a non-empty wire throws: two carries in one round is a
// topology bug (fan-in must be an explicit merge node), not a runtime
// condition the wire papers over.
//
// `observe()` returns the carried value and resets the wire to empty.
// Halt/resume lives on the substrate; the wire does not know about it.

export type WireState<V> =
  | { readonly kind: "empty" }
  | { readonly kind: "carrying"; readonly value: V };

export interface Wire<V> {
  readonly id: string;
  readonly state: WireState<V>;
  carry(value: V): void;
  observe(): V;
}

class WireEntity<V> implements Wire<V> {
  readonly id: string;
  state: WireState<V> = { kind: "empty" };

  constructor(id: string) {
    this.id = id;
  }

  carry(value: V): void {
    if (this.state.kind !== "empty") {
      throw new Error(
        `wire ${this.id}: carry on non-empty wire (already carrying); ` +
          `fan-in must use an explicit merge node`,
      );
    }
    this.state = { kind: "carrying", value };
  }

  observe(): V {
    if (this.state.kind !== "carrying") {
      throw new Error(`wire ${this.id}: observe on empty wire`);
    }
    const { value } = this.state;
    this.state = { kind: "empty" };
    return value;
  }
}

export function createWire<V>(id: string): Wire<V> {
  return new WireEntity<V>(id);
}
