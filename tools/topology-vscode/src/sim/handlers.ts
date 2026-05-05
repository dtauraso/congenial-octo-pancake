// Barrel re-export. Original 264-LOC handlers.ts split into
// sim/handlers/{utils,chain-inhibitor,joins,latches,streak-detectors,
// partition,registry}.ts.

export { bufferedPorts } from "./handlers/utils";
export {
  GATE_TYPES,
  HANDLERS,
  MOTION_TYPES,
  getHandler,
} from "./handlers/registry";
