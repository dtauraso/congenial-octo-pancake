import { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { Spec } from "../../../schema";
import type { CompareMode } from "../CompareToolbar";

// Pure state shell for Inner(): the pile of useState/useRef/useEffect
// declarations that aren't worth a hook of their own (compare-mode
// mirroring, ghost-front spacebar tracking, paneRef/lastSpec/etc).
// Returned object is consumed positionally by Inner.
export function useInnerState() {
  const [comparisonSpec, setComparisonSpec] = useState<Spec | null>(null);
  const [comparisonLabel, setComparisonLabel] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<CompareMode>("off");
  const [compareError, setCompareError] = useState<string | null>(null);

  // Mirror of compareMode for gesture handlers — they read it to short-
  // circuit when the comparison side is showing. Ref so we don't have
  // to re-create every useCallback when the mode flips.
  const compareModeRef = useRef<CompareMode>("off");
  useEffect(() => { compareModeRef.current = compareMode; }, [compareMode]);

  const [ghostFront, setGhostFront] = useState(false);
  // Spacebar held → swap z-order of ghost vs live in onion mode.
  useHotkeys("space", (e) => { e.preventDefault(); setGhostFront(true); },
    { enabled: compareMode === "B-onion", keydown: true, keyup: false });
  useHotkeys("space", () => setGhostFront(false),
    { enabled: compareMode === "B-onion", keydown: false, keyup: true });
  useEffect(() => { if (compareMode !== "B-onion") setGhostFront(false); }, [compareMode]);

  const paneRef = useRef<HTMLDivElement | null>(null);
  const lastSpec = useRef<Spec | null>(null);
  const reconnectOk = useRef<boolean>(false);
  const flashIdsRef = useRef<Set<string>>(new Set());
  const flashTimerRef = useRef<number | null>(null);

  return {
    comparisonSpec, setComparisonSpec,
    comparisonLabel, setComparisonLabel,
    compareMode, setCompareMode,
    compareError, setCompareError,
    compareModeRef, ghostFront,
    paneRef, lastSpec, reconnectOk, flashIdsRef, flashTimerRef,
  };
}
