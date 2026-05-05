# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

---

Continuing on wirefold, branch main (no active task branch).

State at handoff:
  Local main post-merge of task/ci-periodic-checks + task/stop-hook-fast-checks.
  Pushed.
  npm test → 199/199 pass (last run pre-CI infra; not re-run after infra-only changes).
  npm run check:loc → clean.
  go build / go test ./... → clean.
  Working tree: topology.json + topology.view.json + Wiring.go modified
  (in-flight editor state from earlier dogfooding — pre-existing, untouched).

Per-session decision summary:
1. task/ci-periodic-checks (merged 56e0cfe): added
   .github/workflows/periodic-checks.yml. Daily 08:17 UTC + push +
   PR + workflow_dispatch. Two jobs: go (build/test, plus
   informational `go list -m -u all`) and node (npm ci,
   check:loc, npm test, plus informational `npm audit`). Skips
   Playwright/Tier 4 — happy to add weekly-heavy.yml separately.
2. task/stop-hook-fast-checks (merged ccf4737), three commits:
   (a) Stop hook (scripts/stop-checks.sh, wired in
       .claude/settings.json). Runs go build only when .go files
       changed; runs tsc --noEmit + check:loc only when
       tools/topology-vscode .ts/.tsx changed. Skips test suites
       (too slow per turn). On failure emits a Stop-hook block
       decision so the session continues and fixes before stopping.
   (b) Three audit scripts wired informational into
       periodic-checks.yml (audits.md mechanical slices):
       - scripts/audit-channel-names.sh (audit #14): flags generic
         single-word channel names in nodes/ non-test files.
       - scripts/audit-spec-view-hygiene.mjs (audit #15): derives
         topogen-consumed field set from struct tags in
         cmd/topogen/main.go; flags any topology.json node/edge
         field outside it; flags topology.view.json top-level keys
         outside {camera, views, folds, bookmarks}.
       - scripts/audit-doc-drift.mjs (audit #11 mechanical slice):
         flags broken markdown links and pathy backtick refs.
       audits.md updated with a pointer block at the top of the
       CI-backed section.
   (c) CLAUDE.md "Model routing" section: maps task classes to
       haiku / sonnet / opus via Agent({ model: ... }). Mechanism
       is the existing override, not new infra. Default to
       downshifting; reserve Opus for planning + judgment audits
       (6, 9, 10, 19) + non-obvious debugging.

Initial audit findings (NOT addressed — surfaced for follow-up):
- #15 spec/view hygiene: topology.json contains presentation fields
  on every node (x, y, role, sublabel; some have value/state) and
  one edge has a `route` field. None are consumed by topogen. This
  is the registry-flagged "single most damaging architectural rot."
  Decision needed before fixing: do these fields move to
  topology.view.json (clean split), or is there a third "spec
  metadata" surface?
- #11 doc drift: ~120 broken refs, mostly from the recent
  task/repo-reorg (Wiring/ → nodes/Wiring/) and from older planning
  docs (phase-3, phase-4.5, session-log entries) referencing files
  under tools/topology-vscode/src/webview/rf/app.tsx and similar
  paths that have moved or been split. Mechanical fix work — good
  candidate for a sonnet executor pass per the new model-routing
  rule.
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
2. Sonnet executor pass on audit #11 doc-drift findings (mechanical;
   batch-update refs from the repo-reorg path move; prune phase docs
   that are too stale to fix per audit #19).
3. Drive the editor and log fresh friction to session-log.md
   (post-v0 default).
4. Open one of the dormant recommended branches:
   visualize-gate-buffer-state, backpressure-slack-envelope,
   stepping-semantics-doc.

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook now active: scripts/stop-checks.sh runs go build / tsc / check:loc on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
