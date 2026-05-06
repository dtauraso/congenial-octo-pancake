#!/usr/bin/env node
// File-size budget check. Prints any tracked source file >= 200 LOC.
// Refactor target is <= 100 LOC per CLAUDE.md "File size budget".
//
// Exit code:
//   0 — all files <= 200 LOC.
//   1 — at least one file >= 200 LOC.
//
// Generated/fixture/data files are excluded by extension and path.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const TRIGGER = 200;
const TARGET = 100;

const SOURCE_EXTS = new Set([".ts", ".tsx"]);
const EXCLUDE_PATH_FRAGMENTS = [
  "node_modules/",
  "/dist/",
  "/build/",
  "/.vscode-test/",
  "/__fixtures__/",
  "/test-fixtures/",
];

// CLAUDE.md-directed reads that grow over time. The 200/100 rule extends
// to these and any files split off from them (sibling files in the same
// directory prefix).
const INCLUDED_MD_PREFIXES = [
  "docs/planning/visual-editor/session-log",
  "docs/planning/visual-editor/audits",
  "docs/planning/visual-editor/handoff",
];

function isSource(path, repoRelative) {
  for (const frag of EXCLUDE_PATH_FRAGMENTS) {
    if (path.includes(frag)) return false;
  }
  const dot = path.lastIndexOf(".");
  if (dot < 0) return false;
  const ext = path.slice(dot);
  if (SOURCE_EXTS.has(ext)) return true;
  if (ext === ".md") {
    for (const pfx of INCLUDED_MD_PREFIXES) {
      if (repoRelative === `${pfx}.md`) return true;
      // split-off siblings: same dir, same basename prefix
      const slash = pfx.lastIndexOf("/");
      const dir = pfx.slice(0, slash);
      const base = pfx.slice(slash + 1);
      if (repoRelative.startsWith(`${dir}/${base}-`) && repoRelative.endsWith(".md")) {
        return true;
      }
      if (repoRelative.startsWith(`${pfx}/`)) return true;
    }
  }
  return false;
}

function listTrackedFiles() {
  const repoRoot = execSync("git rev-parse --show-toplevel", {
    encoding: "utf8",
  }).trim();
  const out = execSync("git ls-files", { cwd: repoRoot, encoding: "utf8" });
  return out
    .split("\n")
    .filter(Boolean)
    .map((p) => ({ abs: `${repoRoot}/${p}`, rel: p }));
}

function lineCount(path) {
  try {
    const text = readFileSync(path, "utf8");
    return text.split("\n").length;
  } catch {
    return 0;
  }
}

const offenders = [];
for (const { abs, rel } of listTrackedFiles()) {
  if (!isSource(abs, rel)) continue;
  const n = lineCount(abs);
  if (n >= TRIGGER) offenders.push({ path: abs, n });
}

offenders.sort((a, b) => b.n - a.n);

if (offenders.length === 0) {
  console.log(`OK — no source files >= ${TRIGGER} LOC.`);
  process.exit(0);
}

console.log(
  `${offenders.length} file(s) >= ${TRIGGER} LOC (refactor target: <= ${TARGET}):`,
);
for (const { path, n } of offenders) {
  console.log(`  ${n.toString().padStart(5)}  ${path}`);
}
process.exit(1);
