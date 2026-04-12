---
name: project_architecture
description: Neural-inspired concurrent timeline system with lateral inhibition for competitive partition matching
type: project
---

The system is a neural-inspired dataflow architecture where Go channels and goroutines replace conventional control flow.

Key concepts:
- **Timelines** are parallel instances of inhibitor chains that compete to match input patterns
- **Inhibitor nodes** cascade data forward and can suppress (clear data from) neighboring timelines
- **Edge nodes (XOR)** detect contrast between adjacent inhibitors, signaling when input aligns with a partition's timing window
- **Partition nodes** define timing windows; when contrast is detected, the partition that "wins first" triggers suppression of other timelines
- **Lateral inhibition** (from neuroscience) ensures only the strongest matching timeline claims the input — neighbors get suppressed so addition works cleanly
- **DistributeNode** was the branching point for spawning new timelines (currently stripped to basic form)
- **Transfer channels** move partition endpoint references along the inhibitor chain as the system grows

**Why:** The user formalized bits of neuroscience into this concurrent channel-based design. The topology IS the logic — behavior emerges from wiring, not procedural code.

**Current focus (2026-03-16):** Getting 1 partition fully built (shift register cascade, XOR contrast detection, partition state machine). Next: AND gate tree to reduce partition signals to one node at the next level, then multi-timeline binding for equality/multiplication in constant time.

**Bigger picture:** AND gates serve multiple roles: (1) reduction tree within a partition (all inhibitors recognized → one signal up), (2) cross-timeline equality detection (two hierarchies traversed same distance → AND fires), (3) with small timing delay, set membership (neighborhood around equality point). Multiplication, equality, and set theory from the same topology in constant time. This is level 1 AGI with small integers — equality must be constant time.

**How to apply:** When making changes, think in terms of circuit topology, not algorithms. Respect that long channel names encode which two nodes are connected. The user visualizes the system as 3D spiral hierarchies with multiple timelines, but reasons about details one timeline at a time.
