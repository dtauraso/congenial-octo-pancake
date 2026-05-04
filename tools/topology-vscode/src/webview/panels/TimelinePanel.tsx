// Bottom control strip: play/pause + step + speed slider + tick/cycle
// readout + bookmark list + trace load/replay status.

import { useEffect, useState } from "react";
import {
  getTickMs,
  getWorld,
  isPlaying,
  isReplaying,
  jumpTo,
  load as loadRunner,
  loadTrace,
  pause,
  play,
  setTickMs,
  stepOnce,
  subscribeState,
} from "../../sim/runner";
import { detectDrift, summarizeDrift } from "../../sim/drift";
import { initWorld, runUntil } from "../../sim/simulator";
import { historyToTrace, parseTrace, type TraceEvent } from "../../sim/trace";
import { scheduleViewSave, vscode } from "../save";
import {
  getSpec,
  mutateViewer,
  patchTrace,
  setTrace,
  useTrace,
  useViewerState,
} from "../state";
import type { Bookmark } from "../viewerState";

export function TimelinePanel() {
  const viewer = useViewerState();
  const trace = useTrace();
  const [, force] = useState(0);
  const [namingMode, setNamingMode] = useState(false);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    const unsub = subscribeState(() => force((n) => n + 1));
    return () => { unsub?.(); };
  }, []);

  const w = getWorld();
  const playing = isPlaying();
  const replaying = isReplaying();
  const loadedTrace = trace.loaded;

  const label = replaying && loadedTrace
    ? `replay · ${loadedTrace.length} events`
    : w
      ? `tick ${w.tick} · cycle ${w.cycle} · queued ${w.queue.length}`
      : "—";

  const finishInput = (commit: boolean) => {
    setNamingMode(false);
    const name = draftName.trim();
    setDraftName("");
    if (!commit || !name) return;
    const w2 = getWorld();
    if (!w2) return;
    const sel = (viewer.lastSelectionIds ?? [])[0];
    const lastFired = w2.history.length > 0 ? w2.history[w2.history.length - 1].nodeId : "";
    const startNodeId = sel ?? lastFired;
    if (!startNodeId) return;
    addBookmark(name, startNodeId, w2.cycle);
  };

  const onTraceClick = () => {
    if (loadedTrace) clearTrace();
    else vscode.postMessage({ type: "trace-load" });
  };

  const onAddBookmark = () => {
    const w2 = getWorld();
    if (!w2) return;
    pause();
    setDraftName("");
    setNamingMode(true);
  };

  const driftClass = trace.drift === ""
    ? ""
    : trace.drift.startsWith("no drift") ? "ok" : "err";

  return (
    <div className="timeline-panel" data-undo-scope="viewer">
      <button
        type="button"
        className="timeline-play"
        title={playing ? "pause" : "play"}
        onClick={() => (playing ? pause() : play())}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <button
        type="button"
        className="timeline-step"
        title="step one event"
        onClick={() => { pause(); stepOnce(); }}
      >
        ⏭
      </button>
      <input
        type="range"
        className="timeline-speed"
        title="tick interval (ms)"
        min={60}
        max={1500}
        step={20}
        defaultValue={getTickMs()}
        onChange={(e) => setTickMs(Number(e.currentTarget.value))}
      />
      <span className="timeline-time">{label}</span>
      <button
        type="button"
        className="timeline-trace"
        title="load a *.trace.jsonl and replay it on this spec"
        onClick={onTraceClick}
      >
        {loadedTrace ? "exit replay" : "load trace"}
      </button>
      <span className="timeline-trace-label">{loadedTrace ? trace.name : ""}</span>
      <span className={"timeline-drift" + (driftClass ? " " + driftClass : "")}>
        {trace.drift}
      </span>
      <div className="timeline-markers">
        {(viewer.bookmarks ?? []).map((b) => (
          <button
            key={b.name}
            type="button"
            className="timeline-marker"
            title={`${b.name} → cycle ${b.cycle} on ${b.startNodeId} (Delete to remove)`}
            onClick={(ev) => {
              ev.stopPropagation();
              jumpTo(b.cycle, b.startNodeId);
              (ev.currentTarget as HTMLElement).focus();
            }}
            onKeyDown={(ev) => {
              if (ev.key === "Delete" || ev.key === "Backspace") {
                ev.preventDefault();
                deleteBookmark(b.name);
              }
            }}
          >
            {`${b.name} ⤴`}
          </button>
        ))}
      </div>
      {namingMode ? (
        <input
          autoFocus
          type="text"
          placeholder="bookmark name…"
          className="timeline-name-input"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") finishInput(true);
            else if (e.key === "Escape") finishInput(false);
          }}
          onBlur={() => finishInput(true)}
        />
      ) : (
        <button
          type="button"
          className="timeline-add"
          title="save current cycle as a bookmark on the focused node"
          onClick={onAddBookmark}
        >
          + bookmark
        </button>
      )}
    </div>
  );
}

function addBookmark(name: string, startNodeId: string, cycle: number) {
  const next: Bookmark = { name, startNodeId, cycle };
  mutateViewer((s) => {
    const list = s.bookmarks ?? [];
    const idx = list.findIndex((b) => b.name === name);
    if (idx >= 0) list[idx] = next;
    else list.push(next);
    list.sort((a, b) => a.cycle - b.cycle);
    s.bookmarks = list;
  });
  scheduleViewSave();
}

function deleteBookmark(name: string) {
  mutateViewer((s) => {
    s.bookmarks = (s.bookmarks ?? []).filter((b) => b.name !== name);
  });
  scheduleViewSave();
}

function clearTrace() {
  setTrace({ loaded: null, name: "", drift: "" });
  vscode.postMessage({ type: "trace-clear" });
  loadRunner(getSpec());
}

// Host-message entry points; called from main.tsx when the extension posts
// trace-loaded / trace-error.
export function handleTraceLoaded(text: string, label: string) {
  let events: TraceEvent[];
  try {
    events = parseTrace(text);
  } catch (err) {
    handleTraceError(err instanceof Error ? err.message : String(err));
    return;
  }
  const spec = getSpec();
  loadTrace(spec, events);
  pause();
  // Project the simulator's history to the same wire format and compare.
  // Bound the simulator at one step beyond the trace length so a length-
  // mismatch (sim ran longer) is detectable rather than silently truncated.
  const recvCount = events.filter((e) => e.kind === "recv").length;
  const cap = recvCount + 1;
  let i = 0;
  const w = runUntil(spec, initWorld(spec), () => ++i > cap, Math.max(cap * 8, 1000));
  const simProjection = historyToTrace(w.history, spec);
  const drift = summarizeDrift(detectDrift(events, simProjection));
  setTrace({ loaded: events, name: label, drift });
}

export function handleTraceError(message: string) {
  patchTrace({ drift: `trace error: ${message}` });
}
