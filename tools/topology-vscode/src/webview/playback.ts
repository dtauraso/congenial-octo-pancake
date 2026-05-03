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
let wallAtPlay = performance.now();
let msAtPlay = 0;
let rafId = 0;

const animations: Animation[] = [];
const listeners: Set<Listener> = new Set();

export function setDuration(ms: number) {
  durMs = Math.max(1, ms);
  if (currentMs > durMs) currentMs = currentMs % durMs;
}

export function getDuration(): number {
  return durMs;
}

export function registerAnimation(a: Animation) {
  animations.push(a);
  if (!playing) a.pause();
  try {
    a.currentTime = currentMs;
  } catch {
    // Animations not started yet may throw; ignore.
  }
}

export function clearAnimations() {
  for (const a of animations) {
    try { a.cancel(); } catch { /* ignore */ }
  }
  animations.length = 0;
}

export function getCurrentMs(): number {
  if (!playing) return currentMs;
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
  for (const a of animations) {
    try { a.play(); } catch { /* ignore */ }
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
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn();
}

export function startTickLoop() {
  if (rafId) return;
  const tick = () => {
    notify();
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

export function resetPlayback() {
  clearAnimations();
  currentMs = 0;
  msAtPlay = 0;
  wallAtPlay = performance.now();
  notify();
}
