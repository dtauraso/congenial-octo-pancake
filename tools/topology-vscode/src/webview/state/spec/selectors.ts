import type { Spec } from "../../../schema";
import type { ViewerState } from "../viewer/types";
import { spec, viewerState } from "../store";

// ---- Plain getters (non-React) ----
export const getSpec = (): Spec => spec;
export const getViewerState = (): ViewerState => viewerState;
