// Zustand-backed undo/redo removed in phase-3 migration. Undo/redo is now
// handled entirely by rf/history.ts (RF-snapshot-based). This file is kept
// as a placeholder; useUndoRedo is a no-op until callers are cleaned up.
import type { AppCtx } from "./_ctx";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useUndoRedo(_ctx: AppCtx, _hotkeysEnabled: boolean) {
  // RF-snapshot history (rf/history.ts) handles Cmd-Z / Cmd-Shift-Z.
}
