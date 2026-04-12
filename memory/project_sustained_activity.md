---
name: project_sustained_activity
description: Design direction — self-sustaining and disruption modes use the same architecture
type: project
---

**Two modes, same machinery:**
- **Self-sustaining mode:** Partitions cycle through their hierarchical data continuously. AND gates bind hierarchies when they detect same timing.
- **Disruption mode:** External input perturbs the running system. The disruption causes data cascades, contrast changes (XOR), attention conflicts resolved by lateral inhibition.

**Key realization:** The current architecture (cascade inhibitors, AND gate binding, contrast detection, lateral inhibition) is the universal substrate used in both modes. It's not just a pipeline for processing input — it handles both self-sustaining cycling AND disruption from external input.

**Build order:** Get the disruption/response machinery solid first (current work), then later wrap it in the self-sustaining cycling layer. The response system needs to be working before you can meaningfully test perturbation of a running structure.

**How to apply:** The current architecture is correct and shared by both modes. Continue building the current machinery, then add the cycling/self-start layer on top when ready.
