# Latch Backpressure — One Value Per Cycle

Only one latch releases per cycle. The backpressure loop enforces this:

1. `readGate` fires (needs both `in0Ready` AND `syncLatchAck`) → releases `readLatch`
2. Value flows through `i0` → detectors run
3. `syncGate` fires (needs both `sbd0Done` AND `sd0Done`) → releases `syncLatch`
4. `syncLatch` sends ack back to `readGate` → enables the next cycle

Within a single cycle, `readLatch` releases first, then `syncLatch` releases after the detectors finish. They never release simultaneously — it's strictly sequential. The ack from `syncLatch` back to `readGate` is what gates the next value from entering the pipeline.
