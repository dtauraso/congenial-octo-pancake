// Streak detectors. Both treat 0-or-negative as one sign and >=1 as
// the other, matching the existing signed-edge convention.
//
// StreakBreakDetector: emit done=1 if old and new have *different* signs.
// StreakDetector: emit done=1 always; streak=1 if signs match.

import type { HandlerFn } from "../../schema";
import { buffer, clear, has, noEmit } from "./utils";

export const sbdJoin: HandlerFn = (state, input) => {
  const next = buffer(state, input.port, input.value);
  if (has(next, "old") && has(next, "new")) {
    const o = Number(next.old);
    const n = Number(next.new);
    const broke = (o >= 1) !== (n >= 1) ? 1 : 0;
    return {
      state: clear(next, ["old", "new"]),
      emissions: [{ port: "done", value: broke }],
    };
  }
  return noEmit(next);
};

export const sdJoin: HandlerFn = (state, input) => {
  const next = buffer(state, input.port, input.value);
  if (has(next, "old") && has(next, "new")) {
    const o = Number(next.old);
    const n = Number(next.new);
    const same = (o >= 1) === (n >= 1) ? 1 : 0;
    return {
      state: clear(next, ["old", "new"]),
      emissions: [
        { port: "done", value: 1 },
        { port: "streak", value: same },
      ],
    };
  }
  return noEmit(next);
};
