# Audit registry

Index of audit categories. Each audit lives in its own file under [`audits/`](audits/). See [_how-to-use.md](audits/_how-to-use.md) for the meta-doc.

## How to use this doc


## CI-backed audits (already wired from prior phase work)

- [1. Visual regression — SVG / canvas baselines](audits/01-visual-regression-svg-canvas-baselines.md)
- [2. Spec ↔ Go parity per node kind](audits/02-spec-go-parity-per-node-kind.md)
- [3. Edit-to-Go latency](audits/03-edit-to-go-latency.md)
- [4. Plugin hardening lint (opportunistic)](audits/04-plugin-hardening-lint-opportunistic.md)

## Human-driven on-demand audits

- [5. Interaction smoothness](audits/05-interaction-smoothness.md)

## AI-driven on-demand audits (prose only — no tooling)

- [6. Security](audits/06-security.md)
- [7. Code smells](audits/07-code-smells.md)
- [8. Code quality](audits/08-code-quality.md)
- [9. Time and space complexity](audits/09-time-and-space-complexity.md)
- [10. Architectural tradeoffs](audits/10-architectural-tradeoffs.md)
- [11. Documentation drift](audits/11-documentation-drift.md)
- [12. Goroutine and channel leak (Go-specific, load-bearing)](audits/12-goroutine-and-channel-leak-go-specific-load-bearing.md)
- [13. Backpressure invariant](audits/13-backpressure-invariant.md)
- [14. Channel naming convention](audits/14-channel-naming-convention.md)
- [15. Spec / viewer state hygiene](audits/15-spec-viewer-state-hygiene.md)
- [16. Error-surface coverage](audits/16-error-surface-coverage.md)
- [17. Test quality](audits/17-test-quality.md)
- [18. Dependency freshness and supply chain](audits/18-dependency-freshness-and-supply-chain.md)
- [19. Reading-trip economy](audits/19-reading-trip-economy.md)

## Adding new audit categories


## Adding new audit categories

See [_adding-categories.md](audits/_adding-categories.md).
