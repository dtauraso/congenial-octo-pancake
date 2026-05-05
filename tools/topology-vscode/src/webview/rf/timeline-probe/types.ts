// Timeline probe entry shape + animation event types. Strict
// primitives only so JSON.stringify at dump time stays cheap and the
// entries are small.

export type TimelineEntry = {
  // Wall-clock ms (Date.now). Useful for cross-correlating with other
  // probes that timestamp in wall ms.
  wallTs: number;
  // Sim time in ms — frozen on pause. Identical units as wallTs but
  // pause-aware. The unified-clock work made this consistent across
  // animations and probe entries.
  simTime: number;
  // Sim tick at the moment of the event, when known (-1 if no world).
  simTick: number;
  kind:
    | "emit"
    | "fire"
    | "anim-start"
    | "anim-end"
    | "anim-rerun"
    | "play"
    | "pause"
    | "marker";
  edgeId?: string;
  fromNodeId?: string;
  toNodeId?: string;
  nodeId?: string;
  inputPort?: string;
  inputValue?: number | string;
  value?: number | string;
  // anim-end fields
  completed?: boolean;
  arcTraveled?: number;
  // free-form note for marker entries
  note?: string;
  // anim-rerun fields: PulseInstance's [geom, speed] effect re-ran
  // mid-flight. Captures whether arc rebase regressed or path length
  // changed under the dot — both produce visible "slow / stalled"
  // pulses.
  prevArc?: number;
  newStartArc?: number;
  newSvgArc?: number;
  newRemainingMs?: number;
};

export type AnimEvent =
  | {
      kind: "anim-start";
      edgeId: string;
      fromNodeId: string;
      toNodeId: string;
      simTime: number;
      wallTs: number;
    }
  | {
      kind: "anim-end";
      edgeId: string;
      fromNodeId: string;
      toNodeId: string;
      completed: boolean;
      arcTraveled: number;
      simTime: number;
      wallTs: number;
    };

export type AnimListener = (e: AnimEvent) => void;

declare global {
  interface Window {
    __timelineProbe?: boolean;
    __timelineLog?: TimelineEntry[];
    __timelineReport?: (opts?: { clear?: boolean }) => TimelineEntry[];
    __timelineDump?: () => number;
    __timelineMarker?: (note: string) => void;
  }
}
