// Shared run() helper for handlers/* test files.

import { getHandler } from "../../src/sim/handlers";
import type { HandlerState } from "../../src/schema";

export const empty: HandlerState = {};

export function run(
  type: string,
  port: string,
  value: number | string,
  state: HandlerState = empty,
  props: Record<string, number | string> = {},
) {
  const h = getHandler(type, port);
  if (!h) throw new Error(`no handler for ${type}.${port}`);
  return h(state, { port, value }, props);
}
