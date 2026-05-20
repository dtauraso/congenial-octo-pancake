#!/usr/bin/env node
// Parses a single SPEC.md file into a structured object.
// Returns null if no ## View section is present.

/**
 * @param {string} src  Raw SPEC.md content
 * @returns {{ ports: Array<{id:string,direction:string,accent?:string}>, view: Record<string,string> } | null}
 */
export function parseSpec(src) {
  const lines = src.split("\n");

  // Find section boundaries
  function sectionLines(heading) {
    const start = lines.findIndex(
      (l) => l.trim() === `## ${heading}`
    );
    if (start === -1) return null;
    const end = lines.findIndex(
      (l, i) => i > start && l.startsWith("## ")
    );
    return lines.slice(start + 1, end === -1 ? undefined : end);
  }

  const viewLines = sectionLines("View");
  if (!viewLines) return null;

  // Parse a markdown table from an array of lines.
  // Returns array of row objects keyed by header names.
  function parseTable(tableLines) {
    const rows = tableLines.filter((l) => l.trim().startsWith("|"));
    if (rows.length < 2) return [];
    const headers = rows[0]
      .split("|")
      .map((h) => h.trim())
      .filter(Boolean);
    const result = [];
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i]
        .split("|")
        .map((c) => c.trim())
        .filter((_, j, arr) => j > 0 && j < arr.length - 0);
      // skip separator rows
      if (cells.every((c) => /^[-:]+$/.test(c))) continue;
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = cells[idx] ?? "";
      });
      result.push(obj);
    }
    return result;
  }

  // Parse view table (Field | Value)
  const viewRows = parseTable(viewLines);
  const view = {};
  for (const row of viewRows) {
    if (row["Field"] && row["Value"] !== undefined) {
      view[row["Field"].trim()] = row["Value"].trim();
    }
  }
  if (!view["kind"]) return null;

  // Parse ports table
  const portsLines = sectionLines("Ports");
  const ports = [];
  if (portsLines) {
    const portRows = parseTable(portsLines);
    for (const row of portRows) {
      const name = row["TSX handle"] || row["Name"];
      const dir = row["Direction"];
      if (!name || !dir) continue;
      const accent = row["Accent"] || "";
      const entry = { id: name, direction: dir };
      if (accent) entry.accent = accent;
      ports.push(entry);
    }
  }

  return { ports, view };
}
