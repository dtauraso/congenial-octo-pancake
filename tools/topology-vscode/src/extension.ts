import * as path from "path";
import * as vscode from "vscode";
import { TopogenRunner } from "./topogenRunner";
import { BuildAndRunRunner } from "./runCommand";
import { viewSidecarUri, readSidecar } from "./sidecar";
import type { HostToWebviewMsg } from "./messages";
import { buildWebviewHtml } from "./extension/html";
import { handleMessage } from "./extension/handle-message";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      "topology.editor",
      new TopologyEditorProvider(context),
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );
}

class TopologyEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    const outDir = vscode.Uri.file(path.join(this.context.extensionPath, "out"));
    panel.webview.options = { enableScripts: true, localResourceRoots: [outDir] };
    panel.webview.html = buildWebviewHtml(panel.webview, this.context.extensionPath);

    const sidecarUri = viewSidecarUri(document.uri);
    const post = (msg: HostToWebviewMsg) => panel.webview.postMessage(msg);
    const topogen = new TopogenRunner((status) =>
      post({ type: "topogen-status", ...status }),
    );
    const runner = new BuildAndRunRunner((status) =>
      post({ type: "run-status", ...status }),
    );

    // Suppress the `onDidChangeTextDocument` fire we trigger ourselves
    // by tracking the document version we last applied. Text-equality
    // breaks on no-op resaves (the same text fires a change event
    // whose version bumps); version comparison handles those correctly.
    let lastAppliedVersion = document.version;
    const send = () => post({ type: "load", text: document.getText() });
    const sendView = async () =>
      post({ type: "view-load", text: await readSidecar(sidecarUri) });

    const docSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      if (e.document.version <= lastAppliedVersion) return;
      send();
    });
    const viewStateSub = panel.onDidChangeViewState(() => {
      if (!panel.visible) post({ type: "flush" });
    });

    // Hot-reload of the webview bundle (dev-loop). Gated on extension
    // mode rather than relying on the silent quirk that absolute-path
    // GlobPatterns never match for installed users.
    const bundleWatcher =
      this.context.extensionMode === vscode.ExtensionMode.Development
        ? vscode.workspace.createFileSystemWatcher(
            path.join(this.context.extensionPath, "out", "webview.js"),
          )
        : undefined;
    if (bundleWatcher) {
      const reload = () => {
        panel.webview.html = buildWebviewHtml(panel.webview, this.context.extensionPath);
      };
      bundleWatcher.onDidChange(reload);
      bundleWatcher.onDidCreate(reload);
    }

    this.context.subscriptions.push(docSub, viewStateSub, topogen, runner);
    if (bundleWatcher) this.context.subscriptions.push(bundleWatcher);

    panel.onDidDispose(() => {
      docSub.dispose();
      bundleWatcher?.dispose();
      viewStateSub.dispose();
      topogen.dispose();
      runner.dispose();
    });

    panel.webview.onDidReceiveMessage((raw) =>
      handleMessage(raw, {
        document,
        sidecarUri,
        topogen,
        runner,
        post,
        send,
        sendView,
        setLastAppliedVersion: (v) => { lastAppliedVersion = v; },
      }),
    );
  }
}
