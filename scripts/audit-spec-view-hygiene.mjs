#!/usr/bin/env node
// Audit 15: spec/viewer state hygiene.
// Flags fields in topology.json that topogen doesn't read, and fields in
// topology.view.json outside the documented viewer-only set.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const root = execSync("git rev-parse --show-toplevel").toString().trim();
const fail = (msg) => { console.log(msg); process.exitCode = 1; };

// Derive spec field allowlist from topogen struct tags.
const topogen = readFileSync(`${root}/cmd/topogen/main.go`, "utf8");
const tagRe = /`json:"([a-zA-Z0-9_]+)/g;
const specAllowed = new Set([...topogen.matchAll(tagRe)].map((m) => m[1]));

const viewAllowed = new Set(["camera", "views", "folds", "bookmarks", "lastSelectionIds", "nodes", "edges"]);

function walk(obj, allowed, path, file) {
  if (Array.isArray(obj)) { obj.forEach((x, i) => walk(x, allowed, `${path}[${i}]`, file)); return; }
  if (obj === null || typeof obj !== "object") return;
  for (const k of Object.keys(obj)) {
    if (path === "" && !allowed.has(k)) {
      fail(`spec-view: ${file}: top-level key '${k}' not in allowlist`);
    }
  }
}

const spec = JSON.parse(readFileSync(`${root}/topology.json`, "utf8"));
for (const node of spec.nodes ?? []) {
  for (const k of Object.keys(node)) {
    if (!specAllowed.has(k)) {
      fail(`spec-view: topology.json: node '${node.id ?? "?"}' has field '${k}' not consumed by topogen`);
    }
  }
}
for (const edge of spec.edges ?? []) {
  for (const k of Object.keys(edge)) {
    if (!specAllowed.has(k)) {
      fail(`spec-view: topology.json: edge '${edge.id ?? "?"}' has field '${k}' not consumed by topogen`);
    }
  }
}

const view = JSON.parse(readFileSync(`${root}/topology.view.json`, "utf8"));
walk(view, viewAllowed, "", "topology.view.json");
