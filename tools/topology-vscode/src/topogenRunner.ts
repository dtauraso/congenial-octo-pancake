import * as vscode from "vscode";
import * as cp from "child_process";
import type { TopogenStatus } from "./messages";

export type { TopogenStatus };

export class TopogenRunner {
  private pending = false;
  private running = false;
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly post: (s: TopogenStatus) => void) {}

  // Debounced check on save. Validates the spec and confirms codegen would
  // succeed, but does NOT write Wiring/wiring.go — the write happens at run
  // time so the editing loop stays cheap.
  schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.kick();
    }, 250);
  }

  // One-shot synchronous write before a build/run. Returns when the file is
  // written or rejects with a stderr message; status is posted as a side
  // effect so the indicator reflects the write result too.
  write(): Promise<void> {
    return this.run(["run", "./cmd/topogen"]);
  }

  private kick() {
    if (this.running) {
      this.pending = true;
      return;
    }
    this.run(["run", "./cmd/topogen", "--check"]).catch(() => {});
  }

  // Streams stderr instead of buffering it through cp.exec — the 1MB stdout
  // cap there killed runs whose error output was a large compile dump.
  private run(args: string[]): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) return Promise.resolve();
    this.running = true;
    this.post({ state: "running" });
    return new Promise((resolve, reject) => {
      const proc = cp.spawn("go", args, { cwd: folder.uri.fsPath });
      let stderr = "";
      proc.stderr?.on("data", (d) => { stderr += d.toString(); });
      // Drain stdout so the pipe doesn't fill and stall the process; we
      // don't surface it (topogen prints nothing useful on success).
      proc.stdout?.on("data", () => {});
      proc.on("error", (err) => {
        this.running = false;
        const message = (stderr || err.message).trim();
        this.post({ state: "error", message });
        vscode.window.showErrorMessage(`topogen failed: ${message}`);
        this.drainPending();
        reject(new Error(message));
      });
      proc.on("close", (code) => {
        this.running = false;
        if (code === 0) {
          this.post({ state: "ok" });
          this.drainPending();
          resolve();
          return;
        }
        const message = stderr.trim() || `exit code ${code}`;
        this.post({ state: "error", message });
        vscode.window.showErrorMessage(`topogen failed: ${message}`);
        this.drainPending();
        reject(new Error(message));
      });
    });
  }

  private drainPending() {
    if (!this.pending) return;
    this.pending = false;
    this.kick();
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
  }
}
