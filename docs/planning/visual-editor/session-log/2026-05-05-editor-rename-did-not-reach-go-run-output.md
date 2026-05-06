## 2026-05-05 — editor rename did not reach `go run` output

Dogfooding the InputNode-stdout change ([1](screenshots/2026-05-05-editor-go-output-mismatch-1.png)
shows the editor with `in0555` while `go run` output references the
same name; [2](screenshots/2026-05-05-editor-go-output-mismatch-2.png)
shows the editor displaying `in0grtyh` while `go run` output references
`in045ps` — three different names across the editor view, the on-disk
topology.json/Wiring.go, and the spawned binary).

Two distinct bugs surfaced:

1. **Save / codegen race vs. Run.** The Run button posted `{type:"run"}`
   without waiting for the 250ms save debounce, and an in-flight
   contenteditable rename was never committed before Run fired.
   topogen ran against an older topology.json than the editor view.
   Fix on `task/run-flush-pending-edits`: RunButton now blurs any
   active inline edit (commits via the existing blur listener) and
   bundles the latest spec text into the run message; the host applies
   + saves that text before `topogen.write()`.

2. **Stale `lastSpec.current` after rename.** After the rename worked
   and Run produced correct output, dblclicking the same node opened
   the edit field with the OLD name and effectively undid the rename.
   `mutateBoth` replaces `store.spec` via immer but
   `ctx.lastSpec.current` was only updated on load/connect/undo.
   inline-edit's `rerenderFromSpec` rebuilt RF from the stale spec,
   leaving RF nodes with OLD ids; the displayed label only looked
   correct because the contenteditable's typed-in text persisted
   through React's no-op reconciliation. Fix in the same branch:
   `rerenderFromSpec` reads `getSpec()` from the live store and writes
   it back into `lastSpec.current`.

Adjacent fix shipped same day: `task/input-node-stdout` added
`fmt.Printf` to InputNode.Update so the Input rename is actually
visible in `go run` stdout in the first place — without that, the
"editor change → Go output" round-trip had no signal to verify.
