# Independent test plan + evidence requirements

## Mandatory case record
Each acceptance test calls `observeCase({ id, component, item, input, expected, actual, note })` from `tests/helpers/case-recorder.ts`. The helper **records the actual value before asserting** equality with expected. Every required suite must have >=1 observation AND every required component must have >=1 observation in the most recent verification run. No successful test with missing evidence may count as accepted.

Output per case: `test item | input | expected | actual | PASS/FAIL | one-line explanation`; store JSON and Markdown under `reports/tests/<run-id>/` using the exporter. Raw execution logs belong to the external sibling directory.

## Components and minimum acceptance cases
| Component | Required suites | Minimum acceptance cases |
|---|---|---|
| `prime-field` | prime-field.test.ts | GF(7) add/sub/mul/inv/div; GF(2) edge; zero inverse; invalid p |
| `polynomial` | polynomial.test.ts, polynomial-division.test.ts | normalization, zero, product, q*d+r identity, zero divisor |
| `algorithms` | euclidean.test.ts, irreducible.test.ts | Bézout identity, monic gcd, irreducible GF(2)/GF(3) and reducible examples |
| `finite-field` | extension-field.test.ts, field-element.test.ts, properties.test.ts, integration.test.ts | GF(8) known product, GF(9) inverse, axioms, incompatible fields |
| `trace` | trace.test.ts | enabled step order, disabled no steps, same final result |

## Mathematical property testing
- Exhaust GF(8) and GF(9) elements where feasible, with upper execution bound; assert distributivity, additive identity/inverse, nonzero multiplicative inverse, associativity and closure.
- Reproducible seeded sample cases for large `p^n` with seed and sample count in report.
- Tests must not compute `expected` by calling the same function as `actual`. Fixtures/independent derivation are preferred.
- Report invalid input errors explicitly as values like `{ error: "ZeroDivisionError" }`.

## Verification gates
- P1: prime-field
- P2: prime-field, polynomial, algorithms
- P3/P4: prime-field, polynomial, algorithms, finite-field, trace
- P4: the full Vitest suite and, if present, existing `pnpm run build` (Slidev compatibility). The supervisor fails closed on missing required observations.

## Supervisor safety tests
Simulate nonzero Codex exit, hung child, protected-file edits, branch switches, no emitted acceptance observations, test failures, and well-formed completion. Do **not** exercise harmful commands; the self-test uses isolated temporary Git repositories and a fake Codex process.

### Accepted test evidence
The exporter requires source suite names (`prime-field.test.ts`, etc.) as well as component groups. A phase fails if any required suite produces no observed case, even if Vitest itself returns success.
