# Editor architecture

## Framing

The visual editor in `tools/topology-vscode/` is a **general visual-to-text
bridge**. Wirefold is its first consumer, not its definition.

The world runs on text. Compilers, runtimes, AI, infrastructure — all
read text. Humans, however, design concurrent or graph-shaped logic
poorly in text and well in pixels. The editor exists to close that
gap: a designer wires and watches behavior visually, and the artifact
that survives is a textual graph spec that any downstream system can
consume.

This means the editor is *not* a wirefold tool with general-purpose
features bolted on. It is a general graph editor that wirefold happens
to use, alongside any other future project that wants visual design
of textual artifacts (flow charts, dataflow graphs, state machines,
logic visualizers for any language whose runtime is text-based).

## Core vs plugin boundary

### Editor core knows about
- Graphs, nodes, edges, ports — the data model.
- Layout, selection, pan/zoom, rendering primitives.
- Generic animation idioms: edge flow, parked dots, count badges,
  per-node and per-edge state indicators.
- A generic event-driven runner: nodes fire, edges transmit, the
  scheduler advances. Node-type semantics are supplied by plugins.
- Edge-level features general to any graph: slot capacity, ordering.
- Step / play / pause controls.
- Per-node free-form spec text (`node.data.spec`) and its inline
  display affordance. Any visual-text bridge wants this.
- Pluggable export: graph → text in any target language or format.
- AI authoring hooks: graph context assembly for prompt construction.

### Editor core does NOT know about
- Specific node types (inhibitor, partition, AND-gate, latch, ...).
- Domain semantics (lateral inhibition, partition timing, contrast
  detection, backpressure handshakes).
- Any particular export target (Go, Python, Verilog, Mermaid, ...).
- Any wirefold-specific scheduling or ordering rule.

### Plugins supply
- Node-type registry: name, ports, fire semantics, optional custom
  rendering.
- Per-node-type "what counts as buffered / ready / waiting" so the
  core's generic indicators (e.g., gate buffer state) can render
  without knowing what kind of node it is.
- Export targets: takes a graph, returns text in some language.
- Optional AI prompt-template overrides.

Wirefold is one such plugin. Future projects supply their own.

## Artifact

`topology.json` is the durable artifact. It is a generic graph format,
not a wirefold format. Wirefold node types are *values* in that format,
not part of its schema. Other plugins define their own node-type
values. The editor does not change.

Per-node spec text lives in `node.data.spec`. This is the field a
human reads to understand what a node does without leaving the
diagram, and the field an AI reads/writes when generating node
behavior.

## Why this matters now

The project is mid-pivot. The original plan was: Go is the substrate,
TS visualizes it. The current reality is: TS + AI is the design
medium where ideas get formed; export to Go (or any other language)
happens later, cheaply, once a design is settled.

Under that reality, the visual editor is the load-bearing tool, and
its long-term value depends on whether it generalizes beyond
wirefold. If wirefold-specific logic continues to leak into the
editor core, the editor becomes a wirefold-only toy that has to be
rebuilt for every future project. If the boundary is held, the editor
compounds in value: every future visual-design project benefits from
every improvement made today.

The boundary is a discipline, not a refactor. The next feature, the
next audit row, the next bug fix — each one gets asked: *core or
plugin?* Mistakes are cheaper to fix early than late.

## Decision rule for new work

For each proposed change:

1. Would this feature be useful in a graph editor for a project that
   has nothing to do with wirefold? If yes → core.
2. Does it depend on a specific node type's semantics, a specific
   export target, or a specific domain concept? If yes → plugin.
3. Mixed (e.g., generic shape, type-specific data)? Split: the shape
   goes in core, the data comes from a plugin hook.

When in doubt, prefer core with a plugin hook over hard-coding into
core. Hard-coded wirefold logic in core is the failure mode this
document exists to prevent.
