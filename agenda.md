# Codex agenda — Galois Field calculator (feature/build-calculator)

## Core library — supervised phases

> The supervisor gates P0–P4. Acceptance requires the test and build evidence specified for each phase.

| Phase | Task IDs | Parallel owners (max 3) | Dependencies | Acceptance | Status |
|---|---|---|---|---|---|
| P0 | SPEC-01, API-01, TEST-01 | coordinator | clean branch, docs | review math-spec, finalize API signatures, test plan; no core tests required | DONE |
| P1 | PF-DEV, PF-TEST, TRACE-SCHEMA | prime-field-dev, prime-field-test, trace-dev | P0 | PrimeField tests + observation records PASS | DONE |
| P2 | POLY-DEV, POLY-TEST, ALG-DEV, ALG-TEST | polynomial-dev, polynomial-test, algorithm-dev, algorithm-test | P1, division before Euclid and irreducibility | polynomial, polynomial-division, euclidean, irreducible tests PASS | DONE |
| P3 | FIELD-DEV, FIELD-TEST, TRACE-TEST | finite-field-dev, finite-field-test, trace-test | P2 | extension-field, field-element, trace and property tests PASS | DONE |
| P4 | INTEGRATE-01, REGRESSION-01 | coordinator + test agents | P3 | entire Vitest suite, observation reports and existing Slidev build PASS | DONE |

## Execution policy (P0–P4)
- `TODO -> IN_PROGRESS -> TESTING -> DONE` only via supervisor checkpoint after verification.
- On failure: `REPAIRING` at most 2 times per phase; otherwise `FAILED`. Math/permission/contract ambiguity -> `BLOCKED` immediately.
- Each phase records Git SHA, failing test IDs and link to actual report under `reports/tests/<run-id>/` (trusted raw logs also in sibling host directory).
- Never mark DONE when a suite is missing required acceptance observation records.
- Preserve existing Slidev pages; no GUI implementation in P0-P4.
- P0 coordinator must not bypass `api-contract.md` even when parallel agents disagree. Resolve in coordinator scope, and stop if unresolvable.

## Checkpoint placeholders
- Last verified phase: NONE
- Last verified Git commit: (supervisor populates run-status.json)
- Current blockers: NONE

## UI-01 — Interactive Galois Field calculator

**Status** `TODO`

**Execution.** Run this task in an interactive Codex session on `feature/build-calculator`. Use the completed P4 arithmetic core and the user-provided `pages/calculator.md`. Apply the UI-01 scope in the root `AGENTS.md`. The checks below govern UI-01 acceptance.

**Scope.** Embed the calculator in `pages/calculator.md`, preserving its existing frontmatter and user-provided content. Create or update `components/GFCalculator.vue` for inputs, core calls, and results, and `components/GFOperationSteps.vue` for the derivation. Reuse any existing reference in `slides.md`. If the page is missing from the deck, add the minimum necessary reference only with explicit user authorization. Preserve other slides, the arithmetic core, test expectations, dependency files, and deployment settings.

**Behavior.** Support multiplication in GF(2²) with modulus x² + x + 1. Provide two selectors with 0, 1, α, and α + 1, defaulting to α and α + 1. On **Calculate**, show the expression, result, and derivation. Clear the result and derivation when either operand changes. Use the existing multiplication tests to confirm the core import, API, and coefficient order. Derive the result from the core, and render its actual trace when available.

**Acceptance criteria**

- Run the existing test suite and build the Slidev deck with the project's existing scripts.
- Open the calculator slide in a browser. Verify that the default inputs give α(α + 1) = 1, with a derivation that shows expansion and reduction using α² = α + 1.
- Change the second operand to α. Verify that the previous result and derivation clear, then click **Calculate** and verify that α × α = α + 1.
- Check that controls, results, and derivation fit and remain readable at presentation size.
- Report changed files, commands run, and verification results. Mark UI-01 `DONE` only after all checks pass. Record any failed or unverified checks.
