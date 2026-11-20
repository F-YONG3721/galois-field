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

**Status** `DONE`

**Execution.** Run this task in an interactive Codex session on `feature/build-calculator`. Use the completed P4 arithmetic core and the user-provided `pages/calculator.md`. Apply the UI-01 scope in the root `AGENTS.md`. The checks below govern UI-01 acceptance.

**Scope.** Embed the calculator in `pages/calculator.md`, preserving its existing frontmatter and user-provided content. Create or update `components/GFCalculator.vue` for inputs, core calls, and results, and `components/GFOperationSteps.vue` for the derivation. Reuse any existing reference in `slides.md`. If the page is missing from the deck, add the minimum necessary reference only with explicit user authorization. Preserve other slides, the arithmetic core, test expectations, dependency files, and deployment settings.

**Behavior.** Support multiplication in GF(2²) with modulus x² + x + 1. Provide two selectors with 0, 1, α, and α + 1, defaulting to α and α + 1. On **Calculate**, show the expression, result, and derivation. Clear the result and derivation when either operand changes. Use the existing multiplication tests to confirm the core import, API, and coefficient order. Derive the result from the core, and render its actual trace when available.

**Acceptance criteria**

- Run the existing test suite and build the Slidev deck with the project's existing scripts.
- Open the calculator slide in a browser. Verify that the default inputs give α(α + 1) = 1, with a derivation that shows expansion and reduction using α² = α + 1.
- Change the second operand to α. Verify that the previous result and derivation clear, then click **Calculate** and verify that α × α = α + 1.
- Check that controls, results, and derivation fit and remain readable at presentation size.
- Report changed files, commands run, and verification results. Mark UI-01 `DONE` only after all checks pass. Record any failed or unverified checks.

## UI-02 — Generalize the calculator to GF(p^n)

**Status** `TODO`

**Execution and scope.** Follow the interactive workflow and authorized file scope of UI-01. Treat the working GF(4) calculator as the baseline. Reuse existing public arithmetic, validation, and trace APIs. Preserve the existing slide entry and core contracts.

**Field setup.** Accept a prime p and a positive integer n within the core's supported range. For n = 1 use the prime-field API and hide the modulus input. For n > 1 require a monic irreducible polynomial of degree n over GF(p). Validate through the core and show errors beside the relevant inputs. Keep GF(4) with x² + x + 1 as the default preset, and offer GF(7), GF(8) with x³ + x + 1, and GF(9) with x² + 1 as examples. Let users supply other valid parameters and moduli independently of the presets.

**Operands and operations.** Offer addition, subtraction, multiplication, and division via the existing core. Use coefficient inputs for general fields without enumerating p^n elements. Present coefficients with their basis terms and pass them in the order and integer representation required by the core. Show the result in polynomial-basis notation and display available computation steps. Use the selected modulus for the derivation. Show a clear error for division by zero. Clear stale results and steps when the field, operands, or operation change. Keep the interface readable at presentation size and document any practical UI or core limits.

**Acceptance criteria.** Run the existing tests and build the Slidev deck. In the browser verify:

- GF(4) with x² + x + 1 still gives α(α + 1) = 1 and α² = α + 1.
- GF(7) gives 3 ÷ 2 = 5 without requiring a modulus.
- GF(8) with x³ + x + 1 gives α² × α = α + 1.
- GF(9) with x² + 1 gives α² = 2, α + α = 2α, and 1 − α = 2α + 1.
- A manually entered modulus x³ + x² + 1 over GF(2) gives α³ = α² + 1.
- Composite p, nonpositive n, a modulus of the wrong degree, a reducible modulus such as x² + 1 over GF(2), and division by zero produce readable errors. Changing fields clears previous results and updates the operand inputs.
- Report the changed files and observed outcomes. Mark UI-02 DONE after the required checks pass.
