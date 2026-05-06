## 2026-05-03 — slow pulse speed (1/2×)

**Branch:** task/slow-pulse-speed
**Mode:** smoothness audit fix (audits.md #5, "pulses too fast overall")
**Start cost:** $319.14

Per-edge speed inconsistency and probe re-run still open. Global
speed only this session. Single knob `PULSE_PX_PER_MS_AT_REF_TICK`
in [AnimatedEdge.tsx:251](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx#L251)
halved 0.06 → 0.03. Everything visual (dot, dash window, riding
label) scales from this constant, so no per-edge follow-up needed
for the global tune. Build + 157 tests green. User to verify feel
in webview.
