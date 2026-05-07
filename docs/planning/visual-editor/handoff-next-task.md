# Handoff — Next task (START HERE)

**Branch:** `task/node-ticks` (active, not merged). Eight commits on
top of `main` (`8daf317`). All four node visuals restored on the
wires runtime:

- `6554e07` — `subscribeNodeTicks(fn)` + flash/glow plumbing.
- `33fe174` — visual #1 (flash).
- `54cd832` — visual #2 (glow ring).
- `0b3efa9` — `subscribeNodeHeld(fn)` on wires runtime.
- `879e3d7` — visual #3 (held tint).
- `b4a1bee` — `subscribeNodeBuffered(fn)` on wires runtime.
- `8f13034` — visual #4 (buffered halo).

User-confirmed visually through 4/4: flash, glow, held tint,
buffered halo all fire on Input + ReadGate per pulse; rapid
retrigger clean; pause behaves per design.

## Next: merge to main

Per the prior `handoff-next-task.md` plan: "Merge to `main` once all
four visuals are restored." That breakpoint is here.

Pre-merge state:
- 238/238 vitest green.
- `npm run build` clean (extension + webview).
- `npm run check:loc` clean (no files ≥ 200 LOC).
- AnimatedNode at 144 LOC.

Merge requires **user sign-off** per the workflow rule in CLAUDE.md
("Sign-off IS still required for: merging a task branch into
`main`…"). Do not merge without explicit approval in-session.

Suggested merge command once approved:

```
git checkout main && git merge --no-ff task/node-ticks
git push origin main
```

After merge, `task/node-ticks` can stay as a reference branch (do
not delete — matches the convention used for prior task branches).

## After the merge

No queued substrate or visual work. Next task is **friction-driven**
from [session-log.md](session-log.md): user drives the editor,
narrates observations, assistant logs and acts. Do not invent a new
visual or substrate task absent friction.

Open question that surfaced during this branch (parked, not
blocking): should `subscribeNodeHeld` debounce same-value arrives,
or keep firing-on-every-arrive? Current choice is fire-on-every,
React equality suppresses redundant tween. Revisit if a friction
log entry calls it out.

## Working tree note

`.claude/settings.json` and `topology.view.json` carry orthogonal
uncommitted drift. Leave or stash — not part of this merge.

## ALWAYS clause

At end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
