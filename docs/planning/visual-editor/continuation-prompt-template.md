# Continuation prompt template

Copy the fenced block below at the end of a session, fill in `{{...}}`
placeholders with current state, and paste at the start of the next
session. The block contains its own ALWAYS clause so the loop
self-perpetuates.

Stable invariants (branch hygiene, cwd note, friction-logging rule)
live here so they don't have to be rediscovered each session. Edit
this template when an invariant changes; edit the placeholders each
session.

---

```
Continuing on wirefold, branch {{branch-name}}.

State at handoff:
  Local + origin/{{branch-name}} in sync at {{short-sha}}.
  npm test → {{pass}}/{{total}} pass ({{breakdown}}).
  npm run check:loc → {{clean | offenders: ...}}.
  Working tree: {{clean | files modified — note pre-existing vs new}}.

{{Optional: per-branch decision summary — what was chosen on this
branch and why, e.g. substrate choice, pattern adopted. Omit if the
branch is a straightforward continuation.}}

Contract registry status (docs/planning/visual-editor/contracts.md):
  C1 {{✅ | ⏳}} {{one-line status}}
  C2 {{✅ | ⏳}} {{one-line status}}
  C3 {{✅ | ⏳}} {{one-line status}}
  C4 {{✅ | ⏳}} {{one-line status}}
  C5 {{✅ | ⏳}} {{one-line status}}

Open branches (pushed, unmerged):
  {{branch}} — {{one-line state}}.
  {{branch}} — {{one-line state}}.

Next options (each justified against "what did the rest of the world converge on"):
1. {{option — scope, blockers, sign-off needs}}
2. {{option}}
3. {{option}}
4. {{option}}

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, output a copyable continuation prompt inside a fenced code block tailored to the state you're leaving the branch in. The output prompt must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
```
