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

## Grounding

The architecture is a projection of how visual-cognition users
already reason — one level at a time, treating lower levels as
black boxes, re-decomposing when something gets too big — into
specs and code. It does not try to teach visual thinking, prove
visual is universally better, or convert text-thinking users.
Visual cognition is empirically real (every domain that uses
diagrams as primary artifacts is evidence). The tool's job is to
not get in its way.

The 40-year history of visual programming failure is largely a
history of maintenance debt that humans couldn't keep up with —
bespoke diff renderers, plugin registries, round-trip
transformations, doc regeneration, layout stability, custom
tooling — each requiring scarce human-engineering hours no vendor
could justify. The bet here is that AI can perform that
maintenance at a cost low enough to make it routine. The
architectural failure modes were always solvable in principle;
they were unaffordable in practice. AI changes the affordability,
not the soundness, of the underlying ideas.

## Design constraints

These rules pin down the design choices that prevent the
historical failure modes from recurring. Every future feature is
checked against them.

1. **AI as boundary translator, not continuous author.** AI
   decomposes fuzzy human intent into small atomic code blocks;
   everything after — rendering, simulation, persistence,
   editing, copying, reconnecting — is mechanical and AI-free.
   AI is invoked again only when new fuzzy intent enters the
   system, or when the human asks for re-decomposition. The tool
   functions fully without AI; AI makes the boundary cheaper to
   cross.

2. **Atomization is structural and plugin-defined.** Plugins
   declare what counts as an atom (size, allowed types, port
   shape). AI-generated graphs must compose from those atoms.
   "Small enough to read" is a structural property of the atom
   rule, not a hope. Length pressure on a node's textual form is
   a signal to split, not to write longer prose.

3. **Wiring is authoritative; spec is derived.** The graph is
   the source of truth for behavior. Per-node spec text is
   documentation of what the wiring does, not an alternative
   authoring surface.

4. **AI owns spec; humans own notes.** `node.data.spec` is
   AI-generated and read-only from the human side; edits go
   through `node.data.notes`, which AI reads as input but never
   writes. Conflicts between human intent and generated spec
   resolve by editing wiring or notes — never spec.

5. **`topology.json` is AI-authoritative; `topology.view.json`
   is presentation-only.** AI never writes layout. Layout is a
   private dialect of the visual editor.

6. **No semantic information lives only in `topology.view.json`
   or runtime state.** Every fact a node or edge represents must
   be expressible in `topology.json` alone. This preserves the
   future-DSL door without requiring it now.

7. **Deterministic serialization.** Sorted keys, sorted node and
   edge arrays. Semantic-equivalent files are byte-equivalent.
   Enforced in the save lifecycle.

8. **No global auto-layout.** Manual or per-region only.
   Stability beats prettiness; spatial memory matters.

9. **Plugin manifest schema is declarative.** Editor validates
   at load. Shared core vocabulary for ports, shapes, and edge
   styles. Single namespace per editor instance.
   Convention-over-configuration: defaults inferred from
   node-type name and port signature; explicit overrides only
   when needed.

10. **Folding as cognitive baseline shift.** The system operates
    at one fold level at a time — what is visible is what the
    system, simulator, AI, and user all reason about. Folded
    subgraphs are atoms at the current level; their internal
    structure is invisible until the user descends. Complexity
    scales with current-level node count, not total system size.
    Cross-level visibility exists as an explicit debug mode, not
    the default. Folds are opt-in: subgraphs with clean external
    interfaces fold, others stay unfolded.

11. **AI-as-implementer is the load-bearing bet.** Cheap
    maintenance neutralizes Category-A failure modes (tooling
    poverty, metadata burden, stale docs, bad atomization,
    diff/review pain, plugin-registry rot). Category-B failures
    (whether visual is the right medium, whether the audience
    exists, whether the medium scales) are tested empirically,
    not engineered around.

12. **Audience priority.** Visual-first users are the primary
    success criterion — people for whom designing graph-shaped
    logic visually is the right medium. As a secondary
    consideration, transition cost for text-first users is
    minimized where it doesn't compromise the primary goal:
    semantic information lives in `topology.json` (not in
    visual-only state), the artifact format is amenable to a
    future text DSL, and downstream text-tool integration is
    preserved. The tool does not attempt to convert text-first
    users who don't want to switch.

13. **Project validity is empirical.** Session log captures
    friction during real use. If visual-only features
    (animation, click-step, runtime visualization) fall into
    disuse — or if hand-editing `topology.json` becomes more
    common than visual editing — the bet has failed for this
    domain. Kill criteria are explicit, not implicit.

## Known unmitigated risks

These are risks the design accepts rather than solves:

- **AI capability/cost drift.** The bet assumes AI quality and
  affordability stay at roughly current trajectory. If they
  regress, maintenance cost rises and Category-A failures may
  return. Mitigations (caching, version-pinning, provider hedging)
  reduce but do not eliminate this exposure.

- **Medium fit (the graph-shape trap).** Even with all the above,
  visual may not be the right medium for wirefold-shaped logic in
  sustained use. Only empirical use answers this. The session log
  is the instrument.

- **Demo-vs-daily-use arc.** Tools that demo well sometimes fail
  under sustained use in ways no individual fix recovers. Watched
  via the session log; not engineered around.
