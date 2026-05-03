import * as vscode from "vscode";
import * as cp from "child_process";

export type TopogenStatus =
  | { state: "running" }
  | { state: "ok" }
  | { state: "error"; message: string };

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
    return this.exec("go run ./cmd/topogen");
  }

  private kick() {
    if (this.running) {
      this.pending = true;
      return;
    }
    this.exec("go run ./cmd/topogen --check").catch(() => {});
  }

  private exec(cmd: string): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) return Promise.resolve();
    this.running = true;
    this.post({ state: "running" });
    return new Promise((resolve, reject) => {
      cp.exec(cmd, { cwd: folder.uri.fsPath }, (err, _stdout, stderr) => {
        this.running = false;
        if (err) {
          const message = (stderr || err.message).trim();
          this.post({ state: "error", message });
          vscode.window.showErrorMessage(`topogen failed: ${message}`);
          if (this.pending) {
            this.pending = false;
            this.kick();
          }
          reject(new Error(message));
          return;
        }
        this.post({ state: "ok" });
        if (this.pending) {
          this.pending = false;
          this.kick();
        }
        resolve();
      });
    });
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
  }
}
