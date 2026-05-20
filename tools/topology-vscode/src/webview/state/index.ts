// State barrel — re-exports viewer-state from its canonical location.
// spec/store/mutators/selectors have been deleted; all callers now import
// directly from rf/viewer-state or rf/rf-imperative.
export { viewerState, setViewerState, patchViewerState, mutateViewer } from "../rf/viewer-state";
