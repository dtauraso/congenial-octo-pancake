# Latch Backpressure — One Value Per Cycle

Only one latch releases per cycle. The backpressure loop enforces this:

1. `readGate` fires (needs both `in0Ready` AND `detectorLatchAck`) → releases `readLatch`
2. Value flows through `i0` → detectors run
3. `syncGate` fires (needs both `sbd0Done` AND `sd0Done`) → releases `detectorLatch`
4. `detectorLatch` sends ack back to `readGate` → enables the next cycle

Within a single cycle, `readLatch` releases first, then `detectorLatch` releases after the detectors finish. They never release simultaneously — it's strictly sequential. The ack from `detectorLatch` back to `readGate` is what gates the next value from entering the pipeline.
