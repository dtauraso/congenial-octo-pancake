// Comparison-pane toolbar. Webview-rendered (not in extension.ts HTML) so
// it can read/write React state directly. The buttons post compare-head /
// compare-file messages to the host; the receive side lives in app.tsx.

import { vscode } from "../save";

export type CompareMode = "off" | "A-live" | "A-other" | "B-onion";

type Props = {
  mode: CompareMode;
  label: string | null;
  error: string | null;
  onSetMode: (mode: CompareMode) => void;
  onClose: () => void;
};

export function CompareToolbar({ mode, label, error, onSetMode, onClose }: Props) {
  const loaded = mode !== "off";
  return (
    <div className="compare-toolbar">
      {!loaded ? (
        <>
          <button
            type="button"
            className="compare-btn"
            onClick={() => vscode.postMessage({ type: "compare-head" })}
            title="diff against the last committed version of this spec"
          >
            Compare with HEAD
          </button>
          <button
            type="button"
            className="compare-btn"
            onClick={() => vscode.postMessage({ type: "compare-file" })}
            title="diff against another topology spec on disk"
          >
            Compare with file…
          </button>
        </>
      ) : (
        <>
          <span className="compare-label" title={label ?? ""}>vs {label}</span>
          <div className="compare-mode-group" role="group" aria-label="comparison mode">
            <button
              type="button"
              className={"compare-mode" + (mode === "A-live" ? " active" : "")}
              onClick={() => onSetMode("A-live")}
              title="show the live spec; diff highlights mark items unique to live"
            >
              A · live
            </button>
            <button
              type="button"
              className={"compare-mode" + (mode === "A-other" ? " active" : "")}
              onClick={() => onSetMode("A-other")}
              title="show the comparison spec; diff highlights mark items unique to it"
            >
              A · other
            </button>
            <button
              type="button"
              className={"compare-mode" + (mode === "B-onion" ? " active" : "")}
              onClick={() => onSetMode("B-onion")}
              title="onion-skin overlay: live solid, other ghosted (hold space to swap)"
            >
              B · onion
            </button>
          </div>
          <button type="button" className="compare-btn compare-close" onClick={onClose}>
            close
          </button>
        </>
      )}
      {error && <span className="compare-error" title={error}>compare error: {error}</span>}
    </div>
  );
}
