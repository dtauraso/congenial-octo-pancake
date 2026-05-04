# Architecture Decision Records

One file per load-bearing decision. Format: `NNNN-short-slug.md`,
numbered chronologically. Once written, an ADR is **append-only** —
later decisions that supersede an earlier one get their own ADR and
update the older one's `Status` to `Superseded by ADR-NNNN`.

## When to write one

A decision deserves an ADR when **all three** are true:

1. The *what* will be obvious from the code, but the *why* will not.
2. Reversing the decision later would be expensive (substrate swaps,
   data-format choices, dependency adoptions, architectural splits).
3. A future reader — including future-you after a long gap — would
   reasonably ask "why did we do it this way?" and the answer isn't
   findable from the code alone.

Bug fixes, refactors, naming choices, and routine library upgrades
do **not** need ADRs. Their rationale lives in commit messages.

## Template

```markdown
# NNNN — Short title

- **Status:** Accepted | Superseded by ADR-NNNN | Deprecated
- **Date:** YYYY-MM-DD
- **Deciders:** (names or "solo")

## Context

What forced the decision. Constraints, prior failed approaches,
external dependencies maturing into viability, etc.

## Decision

The chosen path, stated plainly.

## Consequences

What this enables, what it costs, what it forecloses. Honest
about tradeoffs.

## Alternatives considered

Each alternative with a sentence on why it was rejected.
```

## Index

- [0001 — React Flow as editor substrate](0001-react-flow-substrate.md)
