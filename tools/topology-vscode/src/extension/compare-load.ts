// Host-side loaders for the comparison pane and their message handlers.
// Comparison is read-only by construction — these never touch the document
// or topogen.

import * as cp from "child_process";
import * as path from "path";
import * as vscode from "vscode";
import { toErrorMessage } from "../utils/error";
import type { HostToWebviewMsg } from "../messages";

export type CompareSource = "head" | "file";

export type CompareResult =
  | { ok: true; source: CompareSource; text: string; label: string }
  | { ok: false; source: CompareSource; message: string };

export async function loadHeadVersion(docUri: vscode.Uri): Promise<CompareResult> {
  const docPath = docUri.fsPath;
  const docDir = path.dirname(docPath);
  try {
    const root = await execGit("git rev-parse --show-toplevel", docDir);
    const rel = path.relative(root.trim(), docPath).split(path.sep).join("/");
    if (!rel || rel.startsWith("..")) {
      return { ok: false, source: "head", message: `${docPath} is outside the git repo at ${root.trim()}` };
    }
    const text = await execGit(`git show HEAD:${shellQuote(rel)}`, root.trim());
    return { ok: true, source: "head", text, label: `HEAD:${rel}` };
  } catch (err) {
    return { ok: false, source: "head", message: toErrorMessage(err) };
  }
}

export async function loadFileVersion(docUri: vscode.Uri): Promise<CompareResult | null> {
  const picked = await vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: "Compare with this spec",
    filters: { "Topology spec": ["json"] },
    defaultUri: vscode.Uri.file(path.dirname(docUri.fsPath)),
  });
  if (!picked || picked.length === 0) return null;
  const target = picked[0];
  try {
    const bytes = await vscode.workspace.fs.readFile(target);
    const text = new TextDecoder("utf-8").decode(bytes);
    const label = vscode.workspace.asRelativePath(target, false);
    return { ok: true, source: "file", text, label };
  } catch (err) {
    return { ok: false, source: "file", message: toErrorMessage(err) };
  }
}

function execGit(cmd: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.exec(cmd, { cwd, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error((stderr || err.message).trim()));
        return;
      }
      resolve(stdout);
    });
  });
}

// Single-quote for POSIX shells. Paths with apostrophes are vanishingly rare
// in this repo, but bytes-in-bytes-out is cheap insurance against the one
// time it matters. (cp.exec runs through /bin/sh, hence the quoting.)
function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export async function handleCompareHead(
  documentUri: vscode.Uri,
  post: (msg: HostToWebviewMsg) => void,
): Promise<void> {
  const result = await loadHeadVersion(documentUri);
  post(
    result.ok
      ? { type: "compare-load", source: result.source, text: result.text, label: result.label }
      : { type: "compare-error", source: result.source, message: result.message },
  );
}

export async function handleCompareFile(
  documentUri: vscode.Uri,
  post: (msg: HostToWebviewMsg) => void,
): Promise<void> {
  const result = await loadFileVersion(documentUri);
  if (!result) return; // user cancelled the picker
  post(
    result.ok
      ? { type: "compare-load", source: result.source, text: result.text, label: result.label }
      : { type: "compare-error", source: result.source, message: result.message },
  );
}
