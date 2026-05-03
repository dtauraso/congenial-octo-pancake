import * as vscode from "vscode";
import * as path from "path";
import * as cp from "child_process";
import * as crypto from "crypto";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      "topology.editor",
      new TopologyEditorProvider(context),
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );
}

class TopologyEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    const outDir = vscode.Uri.file(path.join(this.context.extensionPath, "out"));
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [outDir],
    };
    panel.webview.html = this.html(panel.webview);

    const sidecarUri = viewSidecarUri(document.uri);
    const topogen = new TopogenRunner((status) =>
      panel.webview.postMessage({ type: "topogen-status", ...status })
    );
    const runner = new BuildAndRunRunner((status) =>
      panel.webview.postMessage({ type: "run-status", ...status })
    );

    let lastAppliedText: string | undefined;
    const send = () =>
      panel.webview.postMessage({ type: "load", text: document.getText() });

    const sendView = async () => {
      const text = await readSidecar(sidecarUri);
      panel.webview.postMessage({ type: "view-load", text });
    };

    const docSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      if (e.document.getText() === lastAppliedText) return;
      send();
    });

    const bundlePath = path.join(this.context.extensionPath, "out", "webview.js");
    const bundleWatcher = vscode.workspace.createFileSystemWatcher(bundlePath);
    const reload = () => {
      panel.webview.html = this.html(panel.webview);
    };
    bundleWatcher.onDidChange(reload);
    bundleWatcher.onDidCreate(reload);

    panel.onDidDispose(() => {
      docSub.dispose();
      bundleWatcher.dispose();
      topogen.dispose();
      runner.dispose();
    });

    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === "ready") {
        send();
        await sendView();
      } else if (msg.type === "save") {
        lastAppliedText = msg.text;
        await applyEdit(document, msg.text);
        await document.save();
        topogen.schedule();
      } else if (msg.type === "view-save") {
        await writeSidecar(sidecarUri, msg.text);
      } else if (msg.type === "run") {
        runner.run();
      } else if (msg.type === "run-cancel") {
        runner.cancel();
      }
    });
  }

  private html(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, "out", "webview.js"))
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, "out", "webview.css"))
    );
    const nonce = randomNonce();
    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`,
      `font-src ${webview.cspSource}`,
    ].join("; ");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <title>Topology Editor</title>
  <link rel="stylesheet" href="${styleUri}" />
</head>
<body>
  <div class="toolbar">
    <span id="status" class="clean">saved</span>
    <span id="topogen-status" class="topogen-ok" title="generated Go is up to date">codegen ✓</span>
    <button id="run-btn" class="run-btn" title="go run . in repo root">▶ run</button>
    <span id="run-status" class="run-idle"></span>
  </div>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

async function applyEdit(doc: vscode.TextDocument, text: string) {
  const edit = new vscode.WorkspaceEdit();
  const fullRange = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length)
  );
  edit.replace(doc.uri, fullRange, text);
  await vscode.workspace.applyEdit(edit);
}

type TopogenStatus =
  | { state: "running" }
  | { state: "ok" }
  | { state: "error"; message: string };

class TopogenRunner {
  private pending = false;
  private running = false;
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly post: (s: TopogenStatus) => void) {}

  schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.kick();
    }, 250);
  }

  private kick() {
    if (this.running) {
      this.pending = true;
      return;
    }
    this.run();
  }

  private run() {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) return;
    this.running = true;
    this.post({ state: "running" });
    cp.exec(
      "go run ./cmd/topogen",
      { cwd: folder.uri.fsPath },
      (err, _stdout, stderr) => {
        this.running = false;
        if (err) {
          const message = (stderr || err.message).trim();
          this.post({ state: "error", message });
          vscode.window.showErrorMessage(`topogen failed: ${message}`);
        } else {
          this.post({ state: "ok" });
        }
        if (this.pending) {
          this.pending = false;
          this.run();
        }
      }
    );
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
  }
}

type RunStatus =
  | { state: "running" }
  | { state: "ok" }
  | { state: "error"; message: string }
  | { state: "cancelled" };

class BuildAndRunRunner {
  private proc: cp.ChildProcess | undefined;
  private channel: vscode.OutputChannel | undefined;

  constructor(private readonly post: (s: RunStatus) => void) {}

  run() {
    if (this.proc) return;
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) return;
    if (!this.channel) this.channel = vscode.window.createOutputChannel("topology run");
    this.channel.clear();
    this.channel.show(true);
    this.channel.appendLine("$ go run .");
    this.post({ state: "running" });
    this.proc = cp.spawn("go", ["run", "."], { cwd: folder.uri.fsPath });
    this.proc.stdout?.on("data", (d) => this.channel!.append(d.toString()));
    this.proc.stderr?.on("data", (d) => this.channel!.append(d.toString()));
    this.proc.on("close", (code, signal) => {
      const wasCancelled = signal === "SIGTERM";
      this.proc = undefined;
      if (wasCancelled) {
        this.channel!.appendLine("\n[cancelled]");
        this.post({ state: "cancelled" });
      } else if (code === 0) {
        this.channel!.appendLine("\n[ok]");
        this.post({ state: "ok" });
      } else {
        const message = `exit code ${code}`;
        this.channel!.appendLine(`\n[${message}]`);
        this.post({ state: "error", message });
      }
    });
    this.proc.on("error", (err) => {
      this.proc = undefined;
      this.channel!.appendLine(`\n[spawn error: ${err.message}]`);
      this.post({ state: "error", message: err.message });
    });
  }

  cancel() {
    if (!this.proc) return;
    this.proc.kill("SIGTERM");
  }

  dispose() {
    this.cancel();
    this.channel?.dispose();
  }
}

function viewSidecarUri(docUri: vscode.Uri): vscode.Uri {
  const p = docUri.fsPath;
  const ext = path.extname(p);
  const base = ext ? p.slice(0, -ext.length) : p;
  return vscode.Uri.file(`${base}.view.json`);
}

async function readSidecar(uri: vscode.Uri): Promise<string | undefined> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(bytes).toString("utf8");
  } catch {
    return undefined;
  }
}

async function writeSidecar(uri: vscode.Uri, text: string): Promise<void> {
  await vscode.workspace.fs.writeFile(uri, Buffer.from(text, "utf8"));
}

function randomNonce(): string {
  return crypto.randomBytes(24).toString("base64");
}
