### 18. Dependency freshness and supply chain

**What it checks.**

- `npm audit` results in `tools/topology-vscode/`.
- `go list -m -u all` for the Go module — outdated dependencies
  noted.
- Lockfiles committed and consistent (`package-lock.json`,
  `go.sum`).
- New transitive dependencies that appeared since last audit
  (any surprising additions worth scrutinizing?).
- Any dependency with a maintainer/ownership change since last
  audit.

**Passing.** Clean audit, or each known issue documented with a
decision.

**Cadence.** On demand. Quarterly is plausible; also after any
deliberate dependency update.

**Cost.** Small-to-medium ($3–$10), larger if findings need
research.
