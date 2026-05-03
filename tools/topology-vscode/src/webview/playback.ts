// Master playback clock for the topology animation.
//
// All WAAPI Animations created by render/animation.ts register here so we can
// pause, resume, and seek as a unit. State-text interpolation (RAF-driven)
// also reads `currentMs` from this module instead of wall time so it follows
// pause/seek.

type Listener = () => void;

let durMs = 27000;
let currentMs = 0;
let playing = true;
// `suspended` decouples user playback intent from system visibility: the
// page becoming hidden pauses RAF + WAAPI animations while leaving
// `playing` (user intent) intact, so when the tab returns we resume from
// where we paused instead of catching up to wall time. retainContextWhenHidden
// keeps the webview alive on hidden tabs, so without this the RAF loop and
// per-node animations drained battery indefinitely.
let suspended = false;
let wallAtPlay = performance.now();
let msAtPlay = 0;
let rafId = 0;

const animations: Animation[] = [];
// Plain array (not Set) so notify()'s 60Hz iteration doesn't allocate a
// fresh iterator object every frame.
const listeners: Listener[] = [];

export function setDuration(ms: number) {
  durMs = Math.max(1, ms);
  if (currentMs > durMs) currentMs = currentMs % durMs;
}

export function getDuration(): number {
  return durMs;
}

export function registerAnimation(a: Animation): () => void {
  animations.push(a);
  if (!playing || suspended) a.pause();
  try {
    // Use the live clock, not the module-level `currentMs` (which only
    // updates on pause/seek). Otherwise animations registered after
    // playback started — e.g. when an edge re-mounts after a node
    // selection re-render — start at 0 and slip out of sync, so brief
    // pulses can miss their visible window.
    a.currentTime = getCurrentMs();
  } catch {
    // Animations not started yet may throw; ignore.
  }
  return () => {
    const i = animations.indexOf(a);
    if (i >= 0) animations.splice(i, 1);
    try { a.cancel(); } catch { /* ignore */ }
  };
}

export function clearAnimations() {
  for (const a of animations) {
    try { a.cancel(); } catch { /* ignore */ }
  }
  animations.length = 0;
}

export function getCurrentMs(): number {
  if (!playing || suspended) return currentMs;
  const elapsed = performance.now() - wallAtPlay;
  return (msAtPlay + elapsed) % durMs;
}

export function getT01(): number {
  return getCurrentMs() / durMs;
}

export function isPlaying(): boolean {
  return playing;
}

export function play() {
  if (playing) return;
  playing = true;
  wallAtPlay = performance.now();
  msAtPlay = currentMs;
  if (!suspended) {
    for (const a of animations) {
      try { a.play(); } catch { /* ignore */ }
    }
    startRaf();
  }
  notify();
}

export function pause() {
  if (!playing) return;
  currentMs = getCurrentMs();
  playing = false;
  for (const a of animations) {
    try { a.pause(); } catch { /* ignore */ }
  }
  stopRaf();
  notify();
}

export function seek(t01: number) {
  const clamped = Math.max(0, Math.min(1, t01));
  currentMs = clamped * durMs;
  msAtPlay = currentMs;
  wallAtPlay = performance.now();
  for (const a of animations) {
    try { a.currentTime = currentMs; } catch { /* ignore */ }
  }
  notify();
}

export function subscribe(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

function notify() {
  // Indexed loop with snapshotted length — if a listener unsubscribes
  // during the call we may skip one slot this frame, but the next tick
  // restores correctness, and we avoid the per-frame iterator allocation
  // a Set or for-of would impose.
  const n = listeners.length;
  for (let i = 0; i < n; i++) listeners[i]();
}

function startRaf() {
  if (rafId) return;
  const tick = () => {
    notify();
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

function stopRaf() {
  if (!rafId) return;
  cancelAnimationFrame(rafId);
  rafId = 0;
}

export function startTickLoop() {
  if (!playing || suspended) return;
  startRaf();
}

export function resetPlayback() {
  clearAnimations();
  currentMs = 0;
  msAtPlay = 0;
  wallAtPlay = performance.now();
  notify();
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      if (suspended) return;
      // Snapshot the playhead so getCurrentMs returns the frozen value
      // while we're paused; the wall-time delta otherwise keeps ticking
      // and we'd jump forward when the tab returns.
      currentMs = getCurrentMs();
      suspended = true;
      stopRaf();
      if (playing) {
        for (const a of animations) {
          try { a.pause(); } catch { /* ignore */ }
        }
      }
    } else {
      if (!suspended) return;
      suspended = false;
      if (playing) {
        wallAtPlay = performance.now();
        msAtPlay = currentMs;
        for (const a of animations) {
          try { a.play(); } catch { /* ignore */ }
        }
        startRaf();
      }
    }
  });
}
