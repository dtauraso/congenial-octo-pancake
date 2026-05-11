// HTML manual-take affordance. Subscribes to a wire's phase via
// WireHandle.subscribePhase; enabled iff phase is "loaded". Rendered
// inside the host node's HTML body so it lives in the same DOM layer
// as the React Flow node wrapper (no SVG-outside-viewport hit-test
// issues).

import { useEffect, useState, type RefObject } from "react";
import type { Phase } from "./wire-phase";
import type { WireHandle } from "./Wire";

export function ManualTakeButton({
  wireRef, onTake, inputId = "in0",
}: {
  wireRef: RefObject<WireHandle | null>;
  onTake: () => void;
  inputId?: string;
}) {
  const [phaseKind, setPhaseKind] = useState<Phase["kind"] | undefined>(
    wireRef.current?.phase.kind,
  );

  useEffect(() => {
    const handle = wireRef.current;
    if (!handle) return;
    setPhaseKind(handle.phase.kind);
    return handle.subscribePhase((p) => setPhaseKind(p.kind));
  }, [wireRef]);

  const armed = phaseKind === "loaded";
  return (
    <button
      type="button"
      disabled={!armed}
      onClick={armed ? onTake : undefined}
      data-armed={armed ? "true" : "false"}
      data-input-id={inputId}
      style={{
        marginLeft: 6,
        padding: "1px 6px",
        fontSize: 11,
        lineHeight: 1.2,
        background: "#fff",
        border: "1px solid #333",
        borderRadius: 3,
        cursor: armed ? "pointer" : "default",
        opacity: armed ? 1 : 0.5,
      }}
    >
      ⌫
    </button>
  );
}
