import { useRef, useState } from "react";
import type { Spec } from "../../../schema";

// Pure state shell for Inner(): the pile of useState/useRef declarations
// that aren't worth a hook of their own.
export function useInnerState() {
  const paneRef = useRef<HTMLDivElement | null>(null);
  const lastSpec = useRef<Spec | null>(null);
  const reconnectOk = useRef<boolean>(false);
  const flashIdsRef = useRef<Set<string>>(new Set());
  const flashTimerRef = useRef<number | null>(null);

  return {
    paneRef, lastSpec, reconnectOk, flashIdsRef, flashTimerRef,
  };
}
