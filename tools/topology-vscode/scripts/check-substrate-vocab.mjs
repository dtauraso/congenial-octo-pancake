#!/usr/bin/env node
// Scans tools/topology-vscode/src/substrate/ for banned vocabulary that
// signals the AI (or a human) has drifted from the substrate model.
// See MODEL.md at repo root.
//
// Exits non-zero on any hit. Wire into CI / pre-commit as desired.
//
// Note: the old substrate at src/substrate/ has been deleted as part of
// the collapse-to-one-layer rewrite; this script's target directory no
// longer exists. Replacement vocab discipline for the new React-resident
// substrate at src/webview/substrate-r/ is a separate follow-up.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../src/substrate/", import.meta.url).pathname;

if (!existsSync(ROOT)) {
  console.log("substrate/ directory not present; vocab check skipped.");
  process.exit(0);
}

const LEGACY_SKIP = [];

const BANNED = [
  /\bsetTimeout\b/,
  /\bsetInterval\b/,
  /\bDate\.now\b/,
  /\bperformance\.now\b/,
  /\brequestAnimationFrame\b/,
  /\beffectiveSpeedPxPerMs\b/,
  /\bsignalRendererComplete\b/,
  /\bsimStart\b/,
  /\bPxPerMs\b/,
  /\bdurationMs\b/,
  /\bdeadline\b/i,
  /\bschedule[rd]?\b/i,
  /\bcarrying\b/,
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|mjs|js)$/.test(name)) out.push(p);
  }
  return out;
}

let hits = 0;
for (const file of walk(ROOT)) {
  if (LEGACY_SKIP.some((re) => re.test(file))) continue;
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const re of BANNED) {
      if (re.test(line)) {
        const rel = relative(process.cwd(), file);
        console.error(`${rel}:${i + 1}: banned vocabulary: ${line.trim()}`);
        hits++;
      }
    }
  });
}

if (hits > 0) {
  console.error(`\n${hits} banned-vocabulary hit(s) in substrate/. See MODEL.md.`);
  process.exit(1);
}
console.log("substrate vocabulary clean.");
