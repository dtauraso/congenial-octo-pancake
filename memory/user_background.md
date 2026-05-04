---
name: user_background
description: User designs concurrent dataflow systems with circuit-style wiring
type: user
---

The user designs concurrent systems built from formal circuit primitives they've worked out. They think about the system as 3D spatial structures (spiral hierarchies, multiple timelines) and reason about details by mentally zooming into specific parts rather than viewing everything at once.

They prefer explicit channel wiring over abstractions, value long descriptive names that encode connection topology, and chose Go's goroutine/channel model because it maps naturally to message-passing with no shared state.