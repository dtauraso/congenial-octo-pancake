// Substrate registry context. Each <RSubstrateEdge> registers its
// <Wire>'s ref by edge id; each <RSubstrateNode> registers its <Node>'s
// ref by node id. The provider exposes the driver (halt/resume/pauseAxis).

import {
  createContext, useCallback, useContext, useMemo, useRef, useState,
  type ReactNode, type RefObject,
} from "react";
import type { WireHandle } from "./Wire";
import type { NodeHandle } from "./Node";

// Substrate-level pause axis. A single observable bool every wire's
// RAF reads. When true, each wire freezes its pulse and delivery
// locally — no central authority is consulted. On resume, each wire
// rebases its sim clock so the pulse continues from where it stopped.
//
// Distinct from the cohort gate. The gate's released set is monotonic
// (release-only) and is the wrong axis for pause: after one lap every
// cohort ≥1 is permanently released. Pause must apply to all in-flight
// wires regardless of cohort, so it lives on its own toggleable axis.

export interface PauseAxis {
  readonly paused: boolean;
  set(paused: boolean): void;
  subscribe(cb: (paused: boolean) => void): () => void;
}

export function createPauseAxis(initial = false): PauseAxis {
  let paused = initial;
  const listeners = new Set<(p: boolean) => void>();
  return {
    get paused() { return paused; },
    set(next) {
      if (paused === next) return;
      paused = next;
      for (const cb of [...listeners]) cb(next);
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => { listeners.delete(cb); };
    },
  };
}

export interface DriverHandle {
  readonly halted: boolean;
  readonly pauseAxis: PauseAxis;
  halt(): void;
  resume(): void;
}

function useHaltControl(): DriverHandle {
  const [halted, setHalted] = useState(false);
  const pauseAxisRef = useRef<PauseAxis | null>(null);
  if (!pauseAxisRef.current) pauseAxisRef.current = createPauseAxis();
  const pauseAxis = pauseAxisRef.current;

  const halt = useCallback(() => { setHalted(true); pauseAxis.set(true); }, [pauseAxis]);
  const resume = useCallback(() => { pauseAxis.set(false); setHalted(false); }, [pauseAxis]);

  return useMemo(
    () => ({ halted, pauseAxis, halt, resume }),
    [halted, pauseAxis, halt, resume],
  );
}

interface Registry {
  registerWire(id: string, ref: RefObject<WireHandle | null>): () => void;
  registerNode(id: string, ref: RefObject<NodeHandle | null>): () => void;
  getWireRef(id: string): RefObject<WireHandle | null> | undefined;
  getNodeRef(id: string): RefObject<NodeHandle | null> | undefined;
  driver: DriverHandle;
}

const Ctx = createContext<Registry | null>(null);

export function useRegistry(): Registry {
  const r = useContext(Ctx);
  if (!r) throw new Error("useRegistry: no provider");
  return r;
}

export function SubstrateProvider({ children }: { children: ReactNode }) {
  const wireMapRef = useRef(new Map<string, RefObject<WireHandle | null>>());
  const nodeMapRef = useRef(new Map<string, RefObject<NodeHandle | null>>());
  // Version bump triggers re-derivation of driver inputs as refs are
  // registered/unregistered.
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const driver = useHaltControl();

  const registerWire = useCallback(
    (id: string, ref: RefObject<WireHandle | null>) => {
      wireMapRef.current.set(id, ref);
      bump();
      return () => { wireMapRef.current.delete(id); bump(); };
    }, [bump],
  );
  const registerNode = useCallback(
    (id: string, ref: RefObject<NodeHandle | null>) => {
      nodeMapRef.current.set(id, ref);
      bump();
      return () => { nodeMapRef.current.delete(id); bump(); };
    }, [bump],
  );
  const getWireRef = useCallback(
    (id: string) => wireMapRef.current.get(id), [],
  );
  const getNodeRef = useCallback(
    (id: string) => nodeMapRef.current.get(id), [],
  );
  const value = useMemo<Registry>(
    () => ({ registerWire, registerNode, getWireRef, getNodeRef, driver }),
    // version is included so consumers (RSubstrateNode) re-render when
    // wires/nodes register — otherwise they keep stale NULL_REF lookups
    // from before RSubstrateEdge mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registerWire, registerNode, getWireRef, getNodeRef, driver, version],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
