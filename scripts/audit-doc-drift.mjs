#!/usr/bin/env node
// Audit 11 (mechanical slice): flag broken file/path references in docs.
// Stale narrative claims stay AI-driven — this only catches paths that
// no longer exist.
import { readFileSync, existsSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";

const root = execSync("git rev-parse --show-toplevel").toString().trim();
const files = execSync(
  `git ls-files '*.md' ':!:**/node_modules/**'`,
  { cwd: root },
).toString().trim().split("\n");

const linkRe = /\]\(([^)#?]+)(?:[#?][^)]*)?\)/g;
// Only flag backtick refs that look like real paths (contain "/"); bare
// filenames like `topology.json` are documentation shorthand, not paths.
const inlineRe = /`([^`\s]*\/[^`\s]+\.(?:md|ts|tsx|go|json|svg|sh|mjs|yml|yaml))`/g;

let fail = 0;
for (const file of files) {
  const abs = join(root, file);
  const text = readFileSync(abs, "utf8");
  const checks = [...text.matchAll(linkRe), ...text.matchAll(inlineRe)];
  for (const m of checks) {
    const ref = m[1];
    if (/^https?:\/\//.test(ref) || ref.startsWith("mailto:")) continue;
    if (/[*<>{}]/.test(ref)) continue; // glob/template, not a literal path
    const candidate = ref.startsWith("/")
      ? join(root, ref)
      : join(dirname(abs), ref);
    if (!existsSync(candidate)) {
      console.log(`doc-drift: ${file}: broken reference '${ref}'`);
      fail = 1;
    }
  }
}
process.exit(fail);
