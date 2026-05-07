# Handoff — Next task (START HERE)

**Diagnose stuck-pulse-on-load.** This blocks port-plan step 2.

## Symptom

Open the topology editor cold (or rename any node, which fires a
doc edit and re-loads the spec): the substrate emits the first
pulse but the loop stalls. Play button is a no-op (`_running` is
already true; toggling has no visible effect).

`.probe/substrate-log.jsonl` shows the failure shape:

```
match → loaded (queue: 0,1) → ae-subscribed → emit("0") →
ae-received → ae-mounting → ae-subscribed
```

Note the second `ae-subscribed` AFTER `ae-received`. The
AnimatedEdge re-subscribed (likely React StrictMode unmount/remount
or a re-render) AFTER the pulse was delivered to the original
subscription. The pulse goes to the disposed subscription; the new
one waits forever; substrate waits for an ack that never comes.

Prior `.probe/stuck-pulse-last*.json` files exist from earlier
debugging — this is not the first occurrence.

## Where to look

- `tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx` (or
  wherever AE lives) — the subscribe useEffect, its cleanup, and
  the `edge-ready` emit timing.
- `tools/topology-vscode/src/substrate/runtime.ts` — the
  edge-ready handshake and first-emit gating. The fix in 68e5ae6
  was supposed to prevent dropping the leading token; it's
  regressing under remount.
- `tools/topology-vscode/src/webview/rf/app/_handle-load.ts` —
  `lastLoadedText` dedup (added in f72e7ca). Module-level state
  may interact badly with re-mounts.

## Why "rename stops animation" is the same bug

Inline-edit on a node mutates `topology.json`, which fires
`onDidChangeTextDocument`, which posts a fresh `load` to the
webview. The webview calls `loadSubstrate(next)` which stops and
restarts the substrate. The restart hits the same stuck-pulse
mode as cold-open.

## Step 2 (deferred)

Per-node running indicator + reloop glyph. Spec at
[../sim-substrate/rebuild-plan.md](../sim-substrate/rebuild-plan.md)
§"Visual layer" item 2. Cannot validate visually until stuck-pulse
is fixed. Resume only after cold-open animates reliably.

## Bundle hot-reload (already landed, d7983ab)

Edit → `npm run build` → topology tab refreshes in place. Use the
Output → Log (Extension Host) panel to confirm the watcher fired:
`[topology] bundleWatcher fired: change` then
`hot-reload: re-rendering webview.html`.
