---
name: feedback-delegate-executor-work
description: "Main Opus session should delegate executor-style work (grep sweeps, mechanical edits, multi-step lookups) to haiku/sonnet subagents instead of grinding inline."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 647b5f6e-f04a-4ad9-a56c-8bc5edab6504
---

Main session is for judgment, planning, and synthesis — not for driving `grep`, `Read`, or repetitive `Edit` calls. Delegate executor work to cheaper models via `Agent({ model: "haiku" | "sonnet", ... })`.

**Why:** David called out that model routing (CLAUDE.md "Model routing" section) was not actually being applied — sessions were grinding through multi-step work on Opus when haiku/sonnet would have sufficed. Cost asymmetry favors trying cheap first; the rule is judgment-based and easy to miss in autopilot.

**How to apply:**
- >2 read-only lookups on a topic → spawn `Explore` subagent with `model: "haiku"`.
- Scoped mechanical edit (rename, flag removal, refactor with clear spec) → spawn general-purpose subagent with `model: "sonnet"`.
- Single targeted Read/grep with known path → inline is fine.
- If you catch yourself doing executor-style work mid-turn, stop and delegate the rest.

Paired with a `UserPromptSubmit` hook that nudges on prompts containing "audit", "sweep", "find all", "refactor", etc. See [[feedback-derive-model-from-visual-spec]] for the broader pattern of doing judgment up front before patching.
