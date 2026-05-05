// Shared join-style handler utilities. `buffer` stores an arrival,
// `has` checks the arrival flag, `clear` removes ports, `noEmit`
// returns a no-emission result, `makeJoin` builds an AND-style
// handler. The `__has_<port>` flag convention is read back by
// bufferedPorts() so renderers can highlight half-arrived joins.

import type { HandlerFn, HandlerResult, HandlerState, StateValue } from "../../schema";

export function buffer(
  state: HandlerState,
  port: string,
  value: StateValue,
): HandlerState {
  return { ...state, [port]: value, [`__has_${port}`]: 1 };
}

export const has = (state: HandlerState, port: string): boolean =>
  state[`__has_${port}`] === 1;

export const clear = (
  state: HandlerState,
  ports: string[],
): HandlerState => {
  const out = { ...state };
  for (const p of ports) {
    delete out[p];
    delete out[`__has_${p}`];
  }
  return out;
};

export const noEmit = (state: HandlerState): HandlerResult => ({
  state,
  emissions: [],
});

const HAS_PREFIX = "__has_";

// Plugin-side derivation: which input ports of a node currently hold a
// buffered value. Renderers consume this generically (e.g. AnimatedNode
// halos buffered input handles) without knowing the flag-naming scheme.
export function bufferedPorts(state: HandlerState | undefined): string[] {
  if (!state) return [];
  const out: string[] = [];
  for (const k of Object.keys(state)) {
    if (k.startsWith(HAS_PREFIX) && state[k] === 1) {
      out.push(k.slice(HAS_PREFIX.length));
    }
  }
  return out;
}

export function makeJoin(
  inputs: [string, string],
  outPort: string,
  combine: (a: StateValue, b: StateValue) => StateValue,
): HandlerFn {
  const [pa, pb] = inputs;
  return (state, input) => {
    const next = buffer(state, input.port, input.value);
    if (has(next, pa) && has(next, pb)) {
      return {
        state: clear(next, [pa, pb]),
        emissions: [{ port: outPort, value: combine(next[pa], next[pb]) }],
      };
    }
    return noEmit(next);
  };
}
