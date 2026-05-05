# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

---

Continuing on wirefold, branch main (no active task branch).

State at handoff:
  Local main post-merge of task/audit-15-spec-view-split.
  Pushed.
  npm test → 197/197 pass. tsc --noEmit clean. npm run check:loc clean.
  go build / go test ./... → clean.
  Working tree: nodes/Wiring/Wiring.go modified
  (in-flight Go-side state from earlier work — pre-existing, untouched).
  topology.json + topology.view.json now reflect post-migration shape (committed).

Per-session decision summary:
1. task/audit-15-spec-view-split (merged), five commits:
   (a) cadb2ff — schema+types: dropped x, y, role, sublabel, value,
       state from Node type; dropped route from Edge type. Added
       NodeView { x, y, sublabel?, state? } and EdgeView { route? }
       to ViewerState. Split viewerState.ts at 208 LOC into types +
       viewerState.parse.ts to stay under the 200-LOC budget.
   (b) f67c621 — adapters+readers+writers: spec-to-flow now takes a
       ViewerState arg and reads position/sublabel/state from
       vs.nodes[id] and route from vs.edges[id]; flow-to-spec stops
       writing those fields. Writers (_on-node-drag, inline-edit)
       patch viewerState instead of spec. Readers (NodeBody,
       AnimatedEdge, _bounds, geom, ViewsPanel, _on-node-context,
       ghost) all read from view. diff-core dropped position-based
       moved detection.
   (c) 865706f — migration shim (_handle-load.ts +
       _migrate-legacy-fields.ts): on load, if raw topology.json has
       legacy fields, seeds viewerState.nodes/edges before parseSpec
       drops them. View wins on conflict. Schedules a view save
       immediately so the migration persists.
   (d) 9058073 — tests + fixtures updated for the split.
   (e) 024efc9 — committed the migrated working-tree topology.json +
       topology.view.json (positions, sublabels, states, routes moved
       to view; role + value deleted entirely). Updated
       audit-spec-view-hygiene.mjs viewAllowed set to include
       `nodes` and `edges` keys on the view file.
   Schema decisions confirmed: state moved to view (revisit if
   topogen ever consumes it); role and value deleted as dead.
   Audit count: 24 → 0.

Initial audit findings (NOT addressed — surfaced for follow-up):
- #15 spec/view hygiene: CLEARED.
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
1. Drive the editor and log fresh friction to session-log.md
   (post-v0 default). Highest-value mode now that the registry-flagged
   architectural rot is gone.
2. Open one of the dormant recommended branches:
   visualize-gate-buffer-state, backpressure-slack-envelope,
   stepping-semantics-doc.
3. Address the Go-side dirty edit on nodes/Wiring/Wiring.go (figure
   out what it was for and either commit or revert).

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook now active: scripts/stop-checks.sh runs go build / tsc / check:loc on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
