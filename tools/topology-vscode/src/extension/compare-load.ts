// compare-head / compare-file message handlers. Each loads the
// requested version and posts compare-load on success, compare-error
// on failure (the source field carries the kind: "head" | "file").

import * as vscode from "vscode";
import { loadFileVersion, loadHeadVersion } from "../compareLoader";
import type { HostToWebviewMsg } from "../messages";

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
