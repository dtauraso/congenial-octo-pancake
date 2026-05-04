import { useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";
import {
  performSave,
  performViewSave,
  registerSavers,
} from "./save";

// Owns the debounce timing for spec/view saves and the lifecycle flush
// hooks (visibilitychange, pagehide). Save bodies stay in save.ts; this
// component just wires the React-native debouncer in and registers it.
export function SaveLifecycle() {
  const dSave = useDebouncedCallback(performSave, 250);
  const dView = useDebouncedCallback(performViewSave, 400);

  useEffect(() => {
    registerSavers(
      { schedule: dSave, flush: () => dSave.flush() },
      { schedule: dView, flush: () => dView.flush() },
    );
  }, [dSave, dView]);

  useEffect(() => {
    const flushBoth = () => { dSave.flush(); dView.flush(); };
    const onVis = () => {
      if (document.visibilityState === "hidden") flushBoth();
    };
    window.addEventListener("pagehide", flushBoth);
    window.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flushBoth);
      window.removeEventListener("visibilitychange", onVis);
    };
  }, [dSave, dView]);

  return null;
}
