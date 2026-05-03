import { useEffect, useMemo, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { KIND_COLORS, type Port, type StateValue } from "../../schema";
import { getCurrentMs, getDuration, registerAnimation, subscribe } from "../playback";

// Visible port dot. Sized large enough to be a real drag target, colored by
// the port's edge kind so users can see which kinds connect to which.
function portStyle(side: "left" | "right", topPct: number, color: string): React.CSSProperties {
  return {
    width: 8, height: 8, minWidth: 0, minHeight: 0,
    [side]: -4, top: `${topPct}%`,
    transform: "translate(0, -50%)",
    background: color, border: "1px solid #fff",
    borderRadius: 4,
  };
}

// Fallback (centered, invisible) handles for nodes with no declared ports —
// keeps edges that target the default RF handle from disappearing.
const HANDLE_STYLE_LEFT: React.CSSProperties = {
  width: 1, height: 1, minWidth: 0, minHeight: 0,
  left: 0, top: "50%",
  transform: "translate(0, -50%)",
  background: "transparent", border: "none", pointerEvents: "none",
};
const HANDLE_STYLE_RIGHT: React.CSSProperties = {
  width: 1, height: 1, minWidth: 0, minHeight: 0,
  right: 0, top: "50%",
  transform: "translate(0, -50%)",
  background: "transparent", border: "none", pointerEvents: "none",
};

type StateSeg = { t: number; v: StateValue };

export type AnimatedNodeData = {
  label: string;
  sublabel?: string;
  type: string;
  fill: string;
  stroke: string;
  shape: "rect" | "pill";
  width: number;
  height: number;
  fireTimes?: number[];
  stateFields?: { field: string; segments: StateSeg[] }[];
  inputs: Port[];
  outputs: Port[];
};

const FLASH_HALF_WIDTH = 0.015;

function buildFlashKeyframes(ts: number[]): Keyframe[] {
  const sorted = [...ts].sort((a, b) => a - b);
  const intervals: Array<[number, number]> = [];
  for (const t of sorted) {
    const t0 = Math.max(0, t - FLASH_HALF_WIDTH);
    const t1 = Math.min(1, t + FLASH_HALF_WIDTH);
    const last = intervals[intervals.length - 1];
    if (last && t0 <= last[1]) last[1] = Math.max(last[1], t1);
    else intervals.push([t0, t1]);
  }
  const kf: Keyframe[] = [{ opacity: 0, offset: 0 }];
  for (const [t0, t1] of intervals) {
    const lastOff = kf[kf.length - 1].offset as number;
    if (t0 > lastOff) kf.push({ opacity: 0, offset: t0 });
    const peak = (t0 + t1) / 2;
    if (peak > (kf[kf.length - 1].offset as number)) {
      kf.push({ opacity: 0.5, offset: peak });
    }
    if (t1 > (kf[kf.length - 1].offset as number)) {
      kf.push({ opacity: 0, offset: t1 });
    }
  }
  if ((kf[kf.length - 1].offset as number) < 1) {
    kf.push({ opacity: 0, offset: 1 });
  }
  return kf;
}

function currentValue(segments: StateSeg[], t01: number): StateValue {
  let cur = segments[0].v;
  for (const s of segments) {
    if (s.t <= t01) cur = s.v;
    else break;
  }
  return cur;
}

export function AnimatedNode(props: NodeProps<AnimatedNodeData>) {
  const { data, selected } = props;
  const flashRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = flashRef.current;
    const ts = data.fireTimes;
    if (!el || !ts || ts.length === 0) return;
    const a = el.animate(buildFlashKeyframes(ts), {
      duration: getDuration(),
      iterations: Infinity,
    });
    return registerAnimation(a);
  }, [data.fireTimes]);

  // Stabilize across renders so the state-text effect doesn't churn.
  const stateFields = useMemo(() => data.stateFields ?? [], [data.stateFields]);
  const [stateText, setStateText] = useState<string[]>(() =>
    stateFields.map((f) => `${f.field}=${currentValue(f.segments, 0)}`)
  );
  useEffect(() => {
    if (stateFields.length === 0) return;
    const update = () => {
      const t = getCurrentMs() / getDuration();
      setStateText((prev) => {
        let changed = false;
        const next = stateFields.map((f, i) => {
          const txt = `${f.field}=${currentValue(f.segments, t)}`;
          if (prev[i] !== txt) changed = true;
          return txt;
        });
        return changed ? next : prev;
      });
    };
    update();
    return subscribe(update);
  }, [stateFields]);

  const radius = data.shape === "pill" ? data.height / 2 : 4;
  const hasFires = !!(data.fireTimes && data.fireTimes.length);

  return (
    <div
      style={{
        position: "relative",
        minWidth: data.width,
        width: "max-content",
        height: data.height,
        background: data.fill,
        color: "#1a1a1a",
        border: `${selected ? 2 : 1}px solid ${data.stroke}`,
        borderRadius: radius,
        fontSize: 11,
        padding: "4px 8px",
        boxSizing: "border-box",
        overflow: "visible",
        isolation: "isolate",
      }}
    >
      {hasFires && (
        <div
          ref={flashRef}
          style={{
            position: "absolute",
            inset: 0,
            background: "white",
            opacity: 0,
            borderRadius: radius,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
      {data.inputs.length === 0 ? (
        <Handle type="target" position={Position.Left} style={HANDLE_STYLE_LEFT} isConnectable={false} />
      ) : (
        data.inputs.map((p, i) => (
          <Handle
            key={`in-${p.name}`}
            id={p.name}
            type="target"
            position={Position.Left}
            style={portStyle("left", ((i + 1) * 100) / (data.inputs.length + 1), KIND_COLORS[p.kind] ?? "#888")}
            title={`${p.name} (${p.kind})`}
          />
        ))
      )}
      {data.outputs.length === 0 ? (
        <Handle type="source" position={Position.Right} style={HANDLE_STYLE_RIGHT} isConnectable={false} />
      ) : (
        data.outputs.map((p, i) => (
          <Handle
            key={`out-${p.name}`}
            id={p.name}
            type="source"
            position={Position.Right}
            style={portStyle("right", ((i + 1) * 100) / (data.outputs.length + 1), KIND_COLORS[p.kind] ?? "#888")}
            title={`${p.name} (${p.kind})`}
          />
        ))
      )}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <div className="node-label" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{data.label}</div>
        {data.sublabel ? (
          <div className="node-sublabel">{data.sublabel}</div>
        ) : selected ? (
          <div className="node-sublabel node-sublabel-placeholder">+ sublabel</div>
        ) : null}
        {stateText.map((line, i) => (
          <div key={i} style={{ fontFamily: "monospace", fontSize: 10 }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
