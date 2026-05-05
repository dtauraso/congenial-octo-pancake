// Pure router: subscribes to host→webview messages, posts {type:"ready"}
// once on install, and dispatches typed messages to injected handlers.
// Extracted so contracts.md C1/C3 can assert behavior without a DOM.

import { parseHostToWebview } from "../../../messages";
import type { WebviewToHostMsg } from "../../../messages";

export type HostMessageHandlers = {
  load: (text: string) => void;
  compareLoad: (msg: { text: string; label: string }) => void;
  compareError: (message: string) => void;
  viewLoad: (text: string | undefined) => void;
};

export type RouterDeps = {
  addEventListener: (
    type: "message",
    handler: (e: MessageEvent<unknown>) => void,
  ) => void;
  removeEventListener: (
    type: "message",
    handler: (e: MessageEvent<unknown>) => void,
  ) => void;
  postMessage: (msg: WebviewToHostMsg) => void;
};

export function installHostMessageRouter(
  deps: RouterDeps,
  handlers: HostMessageHandlers,
): () => void {
  const handler = (e: MessageEvent<unknown>) => {
    const msg = parseHostToWebview(e.data);
    if (!msg) return;
    if (msg.type === "load") handlers.load(msg.text);
    else if (msg.type === "compare-load")
      handlers.compareLoad({ text: msg.text, label: msg.label });
    else if (msg.type === "compare-error") handlers.compareError(msg.message);
    else if (msg.type === "view-load") handlers.viewLoad(msg.text);
  };
  deps.addEventListener("message", handler);
  deps.postMessage({ type: "ready" });
  return () => deps.removeEventListener("message", handler);
}
