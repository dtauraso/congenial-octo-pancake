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

const SOURCE_EXTS = new Set([".ts", ".tsx", ".go", ".js", ".mjs", ".cjs"]);
const EXCLUDE_PATH_FRAGMENTS = [
  "node_modules/",
  "/dist/",
  "/build/",
  "/.vscode-test/",
  "/__fixtures__/",
  "/test-fixtures/",
];

function isSource(path) {
  for (const frag of EXCLUDE_PATH_FRAGMENTS) {
    if (path.includes(frag)) return false;
  }
  const dot = path.lastIndexOf(".");
  if (dot < 0) return false;
  return SOURCE_EXTS.has(path.slice(dot));
}

function listTrackedFiles() {
  const repoRoot = execSync("git rev-parse --show-toplevel", {
    encoding: "utf8",
  }).trim();
  const out = execSync("git ls-files", { cwd: repoRoot, encoding: "utf8" });
  return out
    .split("\n")
    .filter(Boolean)
    .map((p) => `${repoRoot}/${p}`);
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
for (const path of listTrackedFiles()) {
  if (!isSource(path)) continue;
  const n = lineCount(path);
  if (n >= TRIGGER) offenders.push({ path, n });
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
