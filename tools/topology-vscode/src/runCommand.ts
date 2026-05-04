import * as vscode from "vscode";
import * as cp from "child_process";
import type { RunStatus } from "./messages";

export type { RunStatus };

export class BuildAndRunRunner {
  private proc: cp.ChildProcess | undefined;
  // Explicit cancel flag — distinguishing cancellation by signal name races
  // against natural exits, since a process that happened to die from SIGTERM
  // on its own would be misreported as "cancelled".
  private cancelled = false;
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
    this.cancelled = false;
    this.post({ state: "running" });
    // detached: true makes the child the leader of a new process group, so
    // a kill(-pid) reaches the inner binary `go run` spawned. Without this,
    // SIGTERM hits the `go` driver but leaves the compiled binary orphaned
    // on macOS.
    this.proc = cp.spawn("go", ["run", "."], { cwd: folder.uri.fsPath, detached: true });
    this.proc.stdout?.on("data", (d) => this.channel!.append(d.toString()));
    this.proc.stderr?.on("data", (d) => this.channel!.append(d.toString()));
    this.proc.on("close", (code) => {
      const cancelled = this.cancelled;
      this.proc = undefined;
      this.cancelled = false;
      if (cancelled) {
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
      this.cancelled = false;
      this.channel!.appendLine(`\n[spawn error: ${err.message}]`);
      this.post({ state: "error", message: err.message });
    });
  }

  cancel() {
    if (!this.proc || this.proc.pid === undefined) return;
    this.cancelled = true;
    try {
      // Negative pid → kill the whole process group (the leader created by
      // detached: true plus any descendants like the compiled binary).
      process.kill(-this.proc.pid, "SIGTERM");
    } catch {
      // Process already exited or no permission — the close handler will
      // clean up either way.
      this.proc.kill("SIGTERM");
    }
  }

  dispose() {
    this.cancel();
    this.channel?.dispose();
  }
}
