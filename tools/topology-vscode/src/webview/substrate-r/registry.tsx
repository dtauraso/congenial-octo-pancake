// Substrate registry context. Each <RSubstrateEdge> registers its
// <Wire>'s ref by edge id; each <RSubstrateNode> registers its <Node>'s
// ref by node id. The provider runs useTickDriver across the
// currently-registered refs.

import {
  createContext, useCallback, useContext, useMemo, useRef, useState,
  type ReactNode, type RefObject,
} from "react";
import type { WireHandle } from "./Wire";
import type { NodeHandle } from "./Node";
import { useTickDriver, type TickDriverHandle } from "./useTickDriver";

interface Registry {
  registerWire(id: string, ref: RefObject<WireHandle | null>): () => void;
  registerNode(id: string, ref: RefObject<NodeHandle | null>): () => void;
  getWireRef(id: string): RefObject<WireHandle | null> | undefined;
  driver: TickDriverHandle;
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

  const nodeRefs = useMemo(
    () => Array.from(nodeMapRef.current.values()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
  const wireRefs = useMemo(
    () => Array.from(wireMapRef.current.values()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
  const driver = useTickDriver({ nodeRefs, wireRefs });

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

  const value = useMemo<Registry>(
    () => ({ registerWire, registerNode, getWireRef, driver }),
    // version is included so consumers (RSubstrateNode) re-render when
    // wires/nodes register — otherwise they keep stale NULL_REF lookups
    // from before RSubstrateEdge mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registerWire, registerNode, getWireRef, driver, version],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
