# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

---

Continuing on wirefold, branch main (no active task branch).

State at handoff:
  Local main post-merge of task/audit-11-doc-drift.
  Pushed.
  npm test → 199/199 pass (last run pre-CI infra; not re-run after doc-only changes).
  npm run check:loc → clean.
  go build / go test ./... → clean.
  Working tree: topology.json + topology.view.json + Wiring.go modified
  (in-flight editor state from earlier dogfooding — pre-existing, untouched).

Per-session decision summary:
1. task/audit-11-doc-drift (merged), two commits:
   (a) 71abfb0 — fix broken path refs in live docs. Updated README,
       docs/editor-audit-2026-05-04.md, audits.md, contracts.md,
       industry-pattern-audit.md, risk-and-effort.md, session-log.md,
       svg-style-guide.md, memory/*.md, tools/topology-vscode/ARCHITECTURE.md.
       Path moves: `Wiring/` → `nodes/Wiring/`, lit-html `render/` →
       React layout, `src/` → `tools/topology-vscode/src/`. Removed
       refs to deleted files (views.ts, timeline.ts, run.ts, bridge.ts,
       rename.ts, sublabel.ts, riding-keyframes.ts, camera.ts,
       render/index.ts, render/animation.ts).
   (b) 3de2170 — historical banners on phase-3, 4, 4.5, 5, 7, 8, 9.
       Per audit #19 (reading-trip economy), chasing every ref in
       closed phase docs is not cost-justified. Each phase doc now has
       a `> **Status:** historical — paths may be stale post-reorg.`
       banner pointing readers to handoff.md for current state.
   Audit count: 134 → 57 findings. The remaining 57 are all in the
   historical phase docs and are documented as accepted.

Initial audit findings (NOT addressed — surfaced for follow-up):
- #15 spec/view hygiene: topology.json contains presentation fields
  on every node (x, y, role, sublabel; some have value/state) and
  one edge has a `route` field. None are consumed by topogen. This
  is the registry-flagged "single most damaging architectural rot."
  Decision needed before fixing: do these fields move to
  topology.view.json (clean split), or is there a third "spec
  metadata" surface?
- #11 doc drift: cleared for live docs. 57 remaining findings live
  in phase-*.md historical docs with status banners — not blocking.
- #14 channel naming: clean after _test.go exclusion.

Contract registry status (docs/planning/visual-editor/contracts.md):
  C1 ✅ ready-once + ready-once-hook (Tier 1+2)
  C2 ✅ spec-data-roundtrip
  C3 ✅ view-load-setviewport
  C4 ✅ pulse-bridge-balance (Tier 3, happy-dom + <PulseInstance>)
  C5 ✅ stuck-pending-precondition

Open branches (pushed, unmerged):
  (none)

Next options:
1. Address audit #15 spec/view rot (highest registry priority,
   needs schema design — Opus task; user sign-off on schema before
   implementation).
2. Drive the editor and log fresh friction to session-log.md
   (post-v0 default).
3. Open one of the dormant recommended branches:
   visualize-gate-buffer-state, backpressure-slack-envelope,
   stepping-semantics-doc.

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook now active: scripts/stop-checks.sh runs go build / tsc / check:loc on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
