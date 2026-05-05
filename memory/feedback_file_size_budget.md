---
name: file size budget
description: TypeScript files (.ts/.tsx) >= 200 LOC must be refactored; refactor target is <= 100 LOC. Always active, including mid-design and mid-debug. Go is exempt.
type: feedback
---

Every TypeScript file (`.ts`, `.tsx`) is on a line-count budget:

- **Trigger threshold:** ≥ **200 LOC** → must be refactored.
- **Refactor target:** ≤ **100 LOC** per resulting file.
- Go (`.go`), Markdown, JSON, fixtures, and generated files are exempt. Go has different cohesion conventions; the rule is motivated by the topology-vscode webview/sim growing past 500 LOC.

**Why:** the user explicitly asked for this rule (2026-05-05) after the topology-vscode files grew past ~500 LOC and a manual refactor pass had to be planned. Small files reduce friction in design/debug because future agents can hold a file in context with low overhead, and bisecting regressions becomes per-concern instead of per-megafile.

**How to apply:**
- The rule is **always active**. Don't suspend it during a debug session or design exploration. If you finish an unrelated change and notice the file is now ≥ 200 LOC, refactor in a follow-up commit before moving on.
- Run `npm run check:loc` (in `tools/topology-vscode/`) to list current offenders. The script is the source of truth — keep it, the CLAUDE.md "File size budget" section, and this memory in sync.
- Don't add the rule to a hard-blocking lint pass mid-refactor; surface offenders as a list, not a build failure, until the codebase is under budget.
- The rule co-exists with "don't introduce premature abstractions": split along existing seams (cohesive units, single responsibilities), not by line-count slicing.
