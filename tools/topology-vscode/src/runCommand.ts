import * as vscode from "vscode";
import * as cp from "child_process";

export type RunStatus =
  | { state: "running" }
  | { state: "ok" }
  | { state: "error"; message: string }
  | { state: "cancelled" };

export class BuildAndRunRunner {
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
