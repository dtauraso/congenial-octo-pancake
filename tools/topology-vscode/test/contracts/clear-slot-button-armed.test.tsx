// @vitest-environment happy-dom
//
// Pins the ClearSlotButton "armed" gating: the ⌫ button on a ReadGate
// is enabled only while the slot's incoming wire is in phase "loaded".
// Otherwise (slot empty, slot taken) the button is disabled and clicks
// are a no-op. Prevents the regression where users click on an empty
// slot expecting the source to load — clicks would silently accumulate
// into clearPending mid-flight, producing a "free pulse" feel.

import { render, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/webview/save", () => ({
  vscode: { postMessage: vi.fn(), setState: vi.fn(), getState: vi.fn() },
}));

import { vscode } from "../../src/webview/save";
const postMessage = vscode.postMessage as unknown as ReturnType<typeof vi.fn>;

import { ClearSlotButton } from "../../src/webview/rf/AnimatedNode/ClearSlotButton";
import { useStore } from "../../src/webview/state/store";
import { setFrame } from "../../src/webview/frame-store";
import type { AnimatedNodeData } from "../../src/webview/rf/AnimatedNode/_types";

const data: AnimatedNodeData = {
  label: "rg",
  type: "ReadGate",
  fill: "#fff",
  stroke: "#000",
  shape: "rect",
  width: 80,
  height: 40,
  inputs: [{ name: "chainIn", kind: "chain" }],
  outputs: [],
};

const WIRE_ID = "e1";

function seedSpec() {
  useStore.setState({
    spec: {
      nodes: [{ id: "rg1", type: "ReadGate", position: { x: 0, y: 0 } } as never],
      edges: [
        { id: WIRE_ID, source: "src", target: "rg1", targetHandle: "chainIn", kind: "chain" } as never,
      ],
    },
  });
}

function setPhase(kind: "empty" | "loaded" | "taken") {
  const wires: ReadonlyArray<readonly [string, { kind: string; value?: unknown }]> =
    kind === "empty" ? [[WIRE_ID, { kind }]] : [[WIRE_ID, { kind, value: 1 }]];
  setFrame({ type: "frame", seq: 0, wires: wires as never, nodes: [] });
}

beforeEach(() => {
  postMessage.mockClear();
  seedSpec();
});
afterEach(cleanup);

describe("ClearSlotButton arming", () => {
  it("is disabled when the slot is empty", () => {
    setPhase("empty");
    const { getByRole } = render(<ClearSlotButton nodeId="rg1" data={data} />);
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it("is enabled and posts clear-slot when the slot is loaded", () => {
    setPhase("loaded");
    const { getByRole } = render(<ClearSlotButton nodeId="rg1" data={data} />);
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      type: "clear-slot",
      nodeId: "rg1",
      port: "chainIn",
    });
  });

  it("is disabled when the slot is taken", () => {
    setPhase("taken");
    const { getByRole } = render(<ClearSlotButton nodeId="rg1" data={data} />);
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("renders nothing for non-ReadGate node types", () => {
    setPhase("loaded");
    const { container } = render(
      <ClearSlotButton nodeId="rg1" data={{ ...data, type: "AndGate" }} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
