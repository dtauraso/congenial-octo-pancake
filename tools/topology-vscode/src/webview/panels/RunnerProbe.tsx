import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { probeRunner, type RunnerHealth } from "../../sim/runner/probe";

const POLL_MS = 250;

export function RunnerProbe() {
  const [h, setH] = useState<RunnerHealth>({ kind: "idle" });
  useEffect(() => {
    const id = setInterval(() => setH(probeRunner()), POLL_MS);
    return () => clearInterval(id);
  }, []);
  const mount = document.getElementById("run-mount");
  if (!mount) return null;
  if (h.kind === "idle" || h.kind === "ok") return null;
  return createPortal(
    <span className="runner-probe-stuck" title={detailTitle(h)}>
      {labelFor(h)}
    </span>,
    mount,
  );
}

function labelFor(h: RunnerHealth): string {
  if (h.kind === "stuck-pending") return `⚠ stuck-pending: ${h.pendingSeeds}`;
  if (h.kind === "stuck-anim") return `⚠ stuck-anim: ${h.activeAnimations}`;
  return "";
}

function detailTitle(h: RunnerHealth): string {
  if (h.kind === "stuck-pending") {
    const next = h.nextSeedAtTick !== undefined ? ` (next seed at tick ${h.nextSeedAtTick})` : "";
    return `Runner: queue empty, ${h.pendingSeeds} pendingSeeds remaining${next}. Auto-restart will not fire.`;
  }
  if (h.kind === "stuck-anim") {
    const breakdown = Object.entries(h.byEdge)
      .map(([id, n]) => `  ${id}: ${n}`)
      .join("\n");
    return `Runner: queue + pendingSeeds drained, but ${h.activeAnimations} animations still in flight. Cycle-restart polling — likely a leaked PulseInstance counter.\n\nLeaked by edge:\n${breakdown}`;
  }
  return "";
}
