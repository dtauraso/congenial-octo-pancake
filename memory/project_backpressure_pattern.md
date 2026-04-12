---
name: Latch + AND Gate Backpressure Pattern
description: Core pipeline flow-control pattern — latches hold values, AND gates control release, ack signals provide backpressure
type: project
---

The latch + AND gate backpressure pattern prevents channel overwrite in the inhibitor chain pipeline.

**Structure per segment:**
source → latch → inhibitor → latch → inhibitor → ...

Each latch holds one value and releases it only when its controlling AND gate fires. Each AND gate waits for:
1. **Detector done signals** — sbd and sd have finished processing the current value
2. **Downstream latch ack** — the next latch in the chain has released its previous value (pipeline slot is free)

**Backpressure loop:**
When a latch releases, it sends an ack back to the AND gate controlling the *previous* latch. This prevents the upstream latch from releasing a new value until the downstream slot is free. One value per pipeline cycle.

**Concrete wiring (as of 2026-03-21):**
- `readGate = AND(in0Ready, detectorLatchAck)` → releases `readLatch`
- `syncGate = AND(sbd0Done, sd0Done, detectorLatch1Ack)` → releases `detectorLatch`
- `syncGate1 = AND(sbd1Done, sd1Done)` → releases `detectorLatch1`
- Each `detectorLatch` acks the gate controlling the latch before it in the chain

**Why:** Replaced the earlier CascadeAndGateNode and sync AND gate approaches. Those allowed eager-read overwrite — a latch could receive a new value before the previous one was consumed. The latch+gate+ack pattern serializes the pipeline without blocking goroutines.

**How to apply:** When extending the chain with more inhibitors, each new segment needs a detectorLatch + syncGate pair. The detectorLatch serves double duty: output latch for the upstream inhibitor, read latch for the downstream one. The ack from each latch feeds back to the gate controlling the previous latch.
