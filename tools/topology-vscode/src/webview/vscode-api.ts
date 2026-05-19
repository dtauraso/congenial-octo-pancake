import type { WebviewToHostMsg } from "../messages";

declare function acquireVsCodeApi(): {
  postMessage(msg: WebviewToHostMsg): void;
  setState(s: unknown): void;
  getState(): unknown;
};

// acquireVsCodeApi() may only be called once per webview JS context. With
// retainContextWhenHidden + HTML hot-reload the bundle can re-execute, so
// we cache the instance on `window` and reuse it. Without this guard the
// second load throws and aborts the entire bundle IIFE — no top-level
// init runs, which silently breaks every module-load side effect.
type VsCodeApi = ReturnType<typeof acquireVsCodeApi>;
const w = window as unknown as { __vscodeApi?: VsCodeApi };
export const vscode: VsCodeApi = w.__vscodeApi ?? (w.__vscodeApi = acquireVsCodeApi());
