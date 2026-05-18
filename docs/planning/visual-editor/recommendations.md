# Recommendations (cross-session backlog)

Living priority table for friction-driven work on the editor /
substrate-r plugin. Referenced from
[handoff.md](handoff.md); update in place as items land or shift.

Last restructured 2026-05-17 after a conversation about what tests
are actually for in an AI-assisted solo project. Conclusion: the
industry reasons for unit/contract tests (shared head, CI gate,
refactor permission, cross-team contracts) don't apply here.
Clean concept-bounded architecture + types + a thin user-facing
scenario layer is the working set. Internal contract tests churn
with the model and have caught ~0 real bugs; every issue this
branch was caught by the user watching the editor. The contract
suite + the test-vs-editor fork it created are slated for deletion.

| # | Priority | Change | Effort | Payoff |
|---|---|---|---|---|
| 1 | **High** | **Delete `test/contracts/` and `TopologyRoot.tsx`.** Remove vitest from `tools/topology-vscode/` if nothing else needs it. Strip the test-path branch from `node-kinds.tsx`. | S | Eliminates the test-vs-editor fork by deletion (no helper needed). Removes ~12 churning files that echo the code instead of pinning a contract. |
| 2 | ~~**High**~~ | ~~**Add a thin editor-path scenario suite**~~ **DONE** (`8802c18`). 4 scenarios in `e2e/scenario-*.spec.ts`: ring-animates, edge-seed, wire-survives-drag, chaininhibitor-held. Run: `npm run test:e2e`. | M | Tests the thing users actually use; same mount/adapter path as prod. Bugs that ship to David fail the suite. AI can't silently rewrite assertions without changing observable behavior. |
| 3 | ~~**High**~~ | ~~Land handoff issue #0 (**run-start signal**)~~ **DONE** (`719e8c7`). run-start is NOT a new substrate concept. Wire.tsx seed now calls `wire.load(seed)` (one delivery path). InputBody self-RAF retained — no central driver exists to replace it. | M-L | Removed the second value-delivery path; seed now animates like any normal wire. InputBody change is STOP (no driver to delegate to). |
| 4 | **Medium** | Fix hook regression: `.claude/hooks/substrate-r-model-derive.sh` → `exit 2`. | XS | Restores the model-derive guard. |
| 5 | **Medium** | Memory hygiene: retire/rewrite `feedback_run_is_input_only.md` (stale post-polling-redesign). | XS | Stops misleading future sessions. |
| 6 | **Low** | Fold `inhibit-right-gate.tsx` (51 LOC) into `node-kinds.tsx`. | XS | One less file in substrate-r read set. |
| 7 | **Low** | Inline `pause-axis.ts` + `useHaltControl.ts` (56 LOC) into `registry.tsx`. | XS | Driver concept in one place. |
| 8 | **Low** | Move `ManualTakeButton.tsx` out of `substrate-r/` into `rf/`. | XS | Keeps the carve-out honest. |
| 9 | **Medium** | Audit substrate-r firing rules for RAF-frame simultaneity assumptions; firing must be slot-state-only per MODEL.md. Find the divergence causing edge-detection wire-length dependency and fix forward. (Reframed 2026-05-17: was "logical-vs-physical tick mismatch / design pass"; MODEL.md has no logical-tick view, so this is a bug hunt.) | M | Removes pacing-by-pixel-length dependency. |

**Suggested order:** #4 + #5 (trivial), then #1 + #2 as a paired
move (delete the old layer, add the new one in the same branch so
the gap is never green-but-blind), then #3, then #6–#8 as one
cleanup commit. #9 waits for a design conversation.

## Item 1 — concrete steps

Land in this order. Ideally pair with item 2 in the same branch so
there's never a window where the old suite is gone and the new one
hasn't replaced it.

1. **Triage the two view-* tests.** Read
   `tools/topology-vscode/test/contracts/view-save-load-gate.test.ts`
   and `view-load-setviewport.test.ts`. They test save/load behavior,
   which IS user-observable. Decide per file: keep as-is, migrate
   into item 2's scenario suite, or delete if item 2 covers it.
   Record the decision in the commit message.
2. **Delete `src/webview/substrate-r/TopologyRoot.tsx`.**
3. **Simplify `node-kinds.tsx`.** Once `TopologyRoot` is gone,
   `renderKindBody`'s `KindBodyCtx` only needs to serve
   `RSubstrateNode`. Narrow the type; remove any test-only branches.
   No behavior change for the editor path.
4. **Delete `test/contracts/`** (minus whatever step 1 spared).
   Includes `_fixtures.ts`, `_harness.ts`, all
   `r-topology-*.test.tsx`, `r-driver.test.tsx`, `r-node.test.tsx`,
   `wire-r-phase.test.ts`.
5. **Remove vitest from `tools/topology-vscode/package.json`.**
   Delete `"test"` and `"test:watch"` scripts. Remove `vitest` from
   `devDependencies`. Run `npm install` to update the lockfile.
   Check for any `@vitest/*` packages and remove those too.
6. **Sweep references.** `grep` for `vitest`, `npm test`,
   `TopologyRoot` across `.claude/hooks/`, `package.json` scripts,
   any CI config, CLAUDE.md, MODEL.md, the `docs/` tree. Remove or
   update.
7. **Verify.** `npm run build` and `tsc --noEmit` both clean. Boot
   the editor and confirm the ring still animates (smoke check; the
   real regression coverage comes from item 2).
8. **Update memory.** Retire any test-related feedback memories that
   no longer apply. Update CLAUDE.md if it references the contract
   suite as a verification step.

Sign-off note: this is a destructive multi-file delete touching
shared state. Per CLAUDE.md "Executing actions with care," confirm
with David before step 4.

## What we keep besides tests

- `tsc --noEmit` — deterministic, doesn't churn.
- `npm run build` — same.
- Vocab-check script + substrate-r-model-derive hook — pin the model, not the code.
- MODEL.md, CLAUDE.md, memory files, recorded editor traces — non-test artifacts that survive AI rewrites because they're tied to user-observable behavior or explicit decisions.
