// parseTrace input validation: blank lines, unknown kinds, missing
// required fields, malformed JSON, non-monotonic step ordering.

import { describe, expect, it } from "vitest";
import { parseTrace } from "../../src/sim/trace";

describe("trace: parser validation", () => {
  it("skips blank lines", () => {
    const jsonl = `{"step":0,"kind":"recv","node":"a","port":"in","value":1}\n\n{"step":1,"kind":"fire","node":"a"}\n`;
    expect(parseTrace(jsonl)).toHaveLength(2);
  });

  it("rejects unknown kind", () => {
    expect(() =>
      parseTrace(`{"step":0,"kind":"teleport","node":"a"}`),
    ).toThrow(/unknown kind/);
  });

  it("rejects non-monotonic step", () => {
    const j = `{"step":1,"kind":"fire","node":"a"}\n{"step":1,"kind":"fire","node":"b"}`;
    expect(() => parseTrace(j)).toThrow(/not greater than previous/);
  });

  it("rejects missing required field", () => {
    expect(() =>
      parseTrace(`{"step":0,"kind":"send","edge":"e1"}`),
    ).toThrow(/value/);
    expect(() =>
      parseTrace(`{"step":0,"kind":"recv","node":"a","value":1}`),
    ).toThrow(/port/);
  });

  it("rejects malformed JSON with line number", () => {
    expect(() =>
      parseTrace(`{"step":0,"kind":"fire","node":"a"}\n{not json}`),
    ).toThrow(/line 2/);
  });
});
