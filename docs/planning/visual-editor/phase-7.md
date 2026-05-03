# Phase 7 — trace replay rejoins the pipeline

**Cap:** several — ~4 Go-tracing + ~2 UI = ~6. **$ extra-usage est:** ~$280 (range $140–$500). Go-edit portion (4 caps × 0.6× = ~$145) is cheap per cap; UI portion (2 caps × 1× = ~$120) is mixed. See [trace-replay-plan.md](../trace-replay-plan.md). +~¼ tests.

- **[~2–3]** Implement value-flow tracing in the generated Go (per [trace-replay-plan.md](../trace-replay-plan.md)). (Dominates; Go edits are token-light.)
- **[~1]** Editor loads or streams traces; replays observed behavior on the same diagram.
- **[~1]** Side-by-side: intended animation (from spec) vs. observed animation (from trace). Drift becomes visible.
- **[~⅛]** ⏳ Tier 2 invariant test: trace replay never mutates the spec. Load a spec, replay a trace against it, assert `JSON.stringify(spec)` is byte-identical before/after. Promotes the rule "trace is observation, spec is design" from doc to test.
- **[~⅛]** ⏳ Tier 3 system-shape test: trace + spec animation in side-by-side. Both panes' master clocks must stay independent (scrubbing one doesn't move the other) but bookmarks must be jumpable from either pane. Catches the obvious failure mode where the side-by-side coupling collapses one clock onto the other.
