## 2026-05-03 — match cascade SVG pulse speed (0.08 px/ms)

**Branch:** task/pulse-speed-svg-match
**Mode:** smoothness audit follow-up — try the reference diagram's speed
**Start cost:** $319.86

After halving to 0.03 (prior entry), pulled the speed from
[diagrams/topology-chain-cascade.svg](../../../diagrams/topology-chain-cascade.svg)
("Edge pulses at 80 px/s"). Set
`PULSE_PX_PER_MS_AT_REF_TICK` → 0.08 in
[AnimatedEdge.tsx:251](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx#L251).
Build + 157 tests green. User to judge feel; expected to be
noticeably faster than the prior 0.06 baseline that was called
"too fast", so revert is on the table.
