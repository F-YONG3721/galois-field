# Codex agenda — GF(p^n) core library (feature/build-calculator)

> Coordinator-managed checklist. Supervisor gates phases; no GUI modifications in this run. Agent reports are not acceptance evidence without external test results.

| Phase | Task IDs | Parallel owners (max 3) | Dependencies | Acceptance | Status |
|---|---|---|---|---|---|
| P0 | SPEC-01, API-01, TEST-01 | coordinator | clean branch, docs | review math-spec, finalize API signatures, test plan; no core tests required | IN_PROGRESS |
| P1 | PF-DEV, PF-TEST, TRACE-SCHEMA | prime-field-dev, prime-field-test, trace-dev | P0 | PrimeField tests + observation records PASS | TODO |
| P2 | POLY-DEV, POLY-TEST, ALG-DEV, ALG-TEST | polynomial-dev, polynomial-test, algorithm-dev, algorithm-test | P1, division before Euclid and irreducibility | polynomial, polynomial-division, euclidean, irreducible tests PASS | TODO |
| P3 | FIELD-DEV, FIELD-TEST, TRACE-TEST | finite-field-dev, finite-field-test, trace-test | P2 | extension-field, field-element, trace and property tests PASS | TODO |
| P4 | INTEGRATE-01, REGRESSION-01 | coordinator + test agents | P3 | entire Vitest suite, observation reports and existing Slidev build PASS | TODO |

## Execution policy
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
