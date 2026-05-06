import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { probeRunner, type RunnerHealth } from "../../sim/runner/probe";
import { dumpPulseProbe, getPulseProbeDumpText } from "../rf/AnimatedEdge/_stuck-pulse-probe";

const POLL_MS = 250;

export function RunnerProbe() {
  const [h, setH] = useState<RunnerHealth>({ kind: "idle" });
  useEffect(() => {
    const id = setInterval(() => {
      setH((prev) => {
        // Once stuck, latch permanently until page reload so the label
        // stays selectable regardless of how the runner state oscillates.
        // The runner may briefly flip stuck → ok → stuck (e.g. a delayed
        // ack lands, queue grows by one, then restalls) which would otherwise
        // clear the label between user attempts to copy it.
        if (prev.kind === "stuck-pending" || prev.kind === "stuck-anim") return prev;
        const next = probeRunner();
        if (next.kind === "stuck-anim") dumpPulseProbe();
        return next;
      });
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);
  // Belt-and-suspenders: also fire the dump from render. The setH-time
  // call only runs on the prev → next transition, so a reload that lands
  // already-stuck (or a re-mount of this component) would otherwise miss
  // the transition. dumpPulseProbe has its own one-shot latch so this
  // is idempotent.
  if (h.kind === "stuck-anim") dumpPulseProbe();
  const mount = document.getElementById("run-mount");
  if (!mount) return null;
  // stuck-anim is no longer a meaningful user-facing signal post-C6
  // (lifecycle is decoupled from visual duration; activeAnimations > 0
  // while cycleRestart polls is the expected steady state). Hide it
  // from the toolbar while keeping the underlying probe state available
  // to internal diagnostics.
  if (h.kind === "idle" || h.kind === "ok" || h.kind === "stuck-anim") return null;
  return createPortal(
    <span className="runner-probe-stuck" title={detailTitle(h)}>
      {labelFor(h)}
    </span>,
    mount,
  );
}

function labelFor(h: RunnerHealth): string {
  if (h.kind === "stuck-pending") return `⚠ stuck-pending: ${h.pendingSeeds}`;
  if (h.kind === "stuck-anim") {
    const edges = Object.entries(h.byEdge)
      .map(([id, n]) => (n > 1 ? `${id}×${n}` : id))
      .join(", ");
    return `⚠ stuck-anim: ${h.activeAnimations} [${edges}]`;
  }
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
    const dump = getPulseProbeDumpText();
    return `Runner: queue + pendingSeeds drained, but ${h.activeAnimations} animations still in flight. Cycle-restart polling — likely a leaked PulseInstance counter.\n\nLeaked by edge:\n${breakdown}\n\nPulse probe (auto-copied to clipboard, also at window.__pulseLeakDump):\n${dump}`;
  }
  return "";
}
