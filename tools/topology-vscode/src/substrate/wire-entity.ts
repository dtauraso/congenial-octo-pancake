// Wire entity: phase is exactly `empty | loaded(v) | taken(v)`. See
// MODEL.md. The three phases match the loop's own await points —
// source loads, destination takes, source acks. carry/observe fold
// load+take+ack for sync callers.

import { nextSeq, type WireEvent, type WireEventKind } from "./wire-events";

export type { WireEvent, WireEventKind } from "./wire-events";

export type WireState<V> =
  | { readonly kind: "empty" }
  | { readonly kind: "loaded"; readonly value: V }
  | { readonly kind: "taken"; readonly value: V };

export interface Wire<V> {
  readonly id: string;
  readonly state: WireState<V>;
  carry(value: V): void;
  observe(): V;
  load(value: V): void;
  take(): V;
  ack(): void;
  markArrived(): void;
  clear(): void;
  awaitLoaded(): Promise<void>;
  awaitArrived(): Promise<void>;
  awaitEmpty(): Promise<void>;
  awaitAcked(): Promise<void>;
  onEvent(listener: (e: WireEvent) => void): () => void;
}

type Waiter = { kind: "loaded" | "arrived" | "empty"; resolve: () => void };

class WireEntity<V> implements Wire<V> {
  readonly id: string;
  state: WireState<V> = { kind: "empty" };
  private arrived = false;
  private clearPending = false;
  private listeners = new Set<(e: WireEvent) => void>();
  private waiters: Waiter[] = [];
  private readonly renderArrival: boolean;

  constructor(id: string, renderArrival = false) {
    this.id = id;
    this.renderArrival = renderArrival;
  }

  private emit(kind: WireEventKind): void {
    const evt: WireEvent = { seq: nextSeq(), wireId: this.id, kind };
    for (const l of this.listeners) l(evt);
    const remaining: Waiter[] = [];
    for (const w of this.waiters) {
      const match =
        (w.kind === "loaded" && this.state.kind === "loaded") ||
        (w.kind === "arrived" && this.state.kind === "loaded" && this.arrived) ||
        (w.kind === "empty" && this.state.kind === "empty");
      if (match) w.resolve();
      else remaining.push(w);
    }
    this.waiters = remaining;
  }

  load(value: V): void {
    if (this.state.kind !== "empty") {
      throw new Error(
        `wire ${this.id}: load on non-empty wire (phase=${this.state.kind}); ` +
          `fan-in must use an explicit merge node`,
      );
    }
    this.arrived = false;
    this.clearPending = false;
    this.state = { kind: "loaded", value };
    this.emit("loaded");
    if (!this.renderArrival) this.markArrived();
  }

  markArrived(): void {
    if (this.state.kind !== "loaded") return;
    if (this.arrived) return;
    this.arrived = true;
    this.emit("arrived");
    if (this.clearPending) {
      this.clearPending = false;
      this.state = { kind: "empty" };
      this.emit("cleared");
    }
  }

  take(): V {
    if (this.state.kind !== "loaded") {
      throw new Error(
        `wire ${this.id}: take on phase=${this.state.kind}`,
      );
    }
    if (!this.arrived) {
      throw new Error(
        `wire ${this.id}: take before pulse arrival; ` +
          `await wire.awaitArrived() before take()`,
      );
    }
    const { value } = this.state;
    this.state = { kind: "taken", value };
    this.emit("taken");
    return value;
  }

  ack(): void {
    if (this.state.kind !== "taken") {
      throw new Error(
        `wire ${this.id}: ack on phase=${this.state.kind}`,
      );
    }
    this.state = { kind: "empty" };
    this.emit("acked");
  }

  clear(): void {
    if (this.state.kind === "empty") return;
    if (this.state.kind === "loaded" && !this.arrived) {
      this.clearPending = true;
      return;
    }
    this.state = { kind: "empty" };
    this.emit("cleared");
  }

  carry(value: V): void { this.load(value); }
  observe(): V { const v = this.take(); this.ack(); return v; }

  private waitFor(kind: "loaded" | "arrived" | "empty"): Promise<void> {
    if (
      (kind === "loaded" && this.state.kind === "loaded") ||
      (kind === "arrived" && this.state.kind === "loaded" && this.arrived) ||
      (kind === "empty" && this.state.kind === "empty")
    ) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => this.waiters.push({ kind, resolve }));
  }
  awaitLoaded(): Promise<void> { return this.waitFor("loaded"); }
  awaitArrived(): Promise<void> { return this.waitFor("arrived"); }
  awaitEmpty(): Promise<void> { return this.waitFor("empty"); }
  awaitAcked(): Promise<void> { return this.waitFor("empty"); }

  onEvent(listener: (e: WireEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export function createWire<V>(id: string, renderArrival = false): Wire<V> {
  return new WireEntity<V>(id, renderArrival);
}
