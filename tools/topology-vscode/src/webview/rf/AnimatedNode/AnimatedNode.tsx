import { useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { KIND_COLORS } from "../../../schema";
import { subscribe, getWorld, getTickMs } from "../../../sim/runner";
import { subscribeNodeTicks } from "../../../substrate/runtime-wires";
import { portStyle, HANDLE_STYLE_LEFT, HANDLE_STYLE_RIGHT, FLASH_DURATION_MS } from "./_styles";
import { StepButton } from "./StepButton";
import { SpecPanel } from "./SpecPanel";
import { NodeBody } from "./NodeBody";
import type { AnimatedNodeData } from "./_types";

export function AnimatedNode(props: NodeProps<AnimatedNodeData>) {
  const { id, data, selected } = props;

  const [stateText, setStateText] = useState<string[]>([]);
  // Phase 6 Chunk A: motion is a derived view of simulator state. On each
  // fire we read world.state[id] for dx/dy and tween via CSS transform over
  // the current tick interval.
  const [offset, setOffset] = useState<{ dx: number; dy: number }>(() => {
    const s = getWorld()?.state?.[id];
    return { dx: Number(s?.dx ?? 0), dy: Number(s?.dy ?? 0) };
  });
  const [tweenMs, setTweenMs] = useState<number>(getTickMs());
  const flashRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return subscribeNodeTicks((nodeId) => {
      if (nodeId !== id) return;
      const el = flashRef.current;
      if (el) {
        el.getAnimations().forEach((a) => a.cancel());
        el.animate(
          [{ opacity: 0 }, { opacity: 0.5, offset: 0.5 }, { opacity: 0 }],
          { duration: FLASH_DURATION_MS },
        );
      }
      const gl = glowRef.current;
      if (gl) {
        gl.getAnimations().forEach((a) => a.cancel());
        gl.animate(
          [
            { boxShadow: `0 0 0 0 ${data.stroke}00`, opacity: 0 },
            { boxShadow: `0 0 0 4px ${data.stroke}cc`, opacity: 0.8, offset: 0.4 },
            { boxShadow: `0 0 0 2px ${data.stroke}66`, opacity: 0.4, offset: 0.7 },
            { boxShadow: `0 0 0 0 ${data.stroke}00`, opacity: 0 },
          ],
          { duration: FLASH_DURATION_MS },
        );
      }
    });
  }, [id, data.stroke]);

  useEffect(() => {
    const unsub = subscribe((ev) => {
      if (ev.type !== "fire" || ev.nodeId !== id) return;
      setStateText([`${ev.inputPort}=${ev.inputValue}`]);
      const s = getWorld()?.state?.[id];
      setOffset({ dx: Number(s?.dx ?? 0), dy: Number(s?.dy ?? 0) });
      setTweenMs(getTickMs());
    });
    return unsub;
  }, [id]);

  const radius = data.shape === "pill" ? data.height / 2 : 4;

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
        transform: `translate(${offset.dx}px, ${offset.dy}px)`,
        transition: `transform ${tweenMs}ms linear`,
        willChange: "transform",
      }}
    >
      <div
        ref={glowRef}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: radius,
          pointerEvents: "none",
          opacity: 0,
          zIndex: -1,
        }}
      />
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
      {selected ? <StepButton id={id} stroke={data.stroke} /> : null}
      <SpecPanel id={id} data={data} />
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
      <NodeBody data={data} selected={!!selected} stateText={stateText} />
    </div>
  );
}
