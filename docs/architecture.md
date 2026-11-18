# Architecture — shared Slidev repository, isolated TypeScript math engine

- `lib/galois/` is dependency-free pure TypeScript; do not import Vue, Slidev, KaTeX, DOM or Node APIs.
- Layer 1: PrimeField (`GF(p)`), coefficient reduction and integer modular inverse.
- Layer 2: Polynomial over PrimeField; long division, extended Euclid and irreducibility analysis.
- Layer 3: ExtensionField (`GF(p)[x]/(f)`), FieldElement with canonical representatives.
- Crosscutting: optional TraceSink capturing **structured** steps, never rendering strings for LaTeX.
- `components/` may later import `lib/galois/index.ts`, but the core does not depend on components.
- `tests/` holds independent mathematical assertions and `observeCase` calls; `scripts/export-test-report.mjs` transforms actual observations to per-component Markdown/JSON.
- Coordinator can dispatch 3 disjoint agents concurrently. Source/test ownership maps are specified in each `.codex/agents/*.toml`.
- Unattended run: `scripts/supervise-codex.mjs` invokes `codex exec`, bounds each phase, independently runs Vitest and optionally Slidev build, creates local Git checkpoint commits, writes event logs outside workspace, and stops on unexpected changes. The P0 contract files are SHA-256 frozen before subsequent phases; any later edit is treated as unsafe.
- Existing deployment scripts, package dependencies, slides and Vue components are explicitly out of scope for this phase.
