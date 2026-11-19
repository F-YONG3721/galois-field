# Galois Field calculator — supervised Codex development policy

## Priority and scope
- P0–P4 cover the existing arithmetic core and its tests. When asked to execute UI-01, work on feature/build-calculator in an interactive Codex session and follow the UI task in agenda.md.
- For UI-01, edit the user-provided pages/calculator.md and create or update components/GFCalculator.vue and components/GFOperationSteps.vue. Preserve the page’s existing frontmatter and user-provided content. Leave the arithmetic core, expected test values, other slides, dependency files, and deployment settings unchanged.
- If slides.md already includes pages/calculator.md, use the existing reference. If the page is missing from the deck, add the minimum necessary reference only when the user explicitly authorizes editing slides.md.
- The authoritative sources are `docs/math-spec.md`, `docs/api-contract.md`, `docs/test-plan.md`, and the phase/task list in `agenda.md`. Do not weaken or rewrite approved mathematical requirements to pass tests.
- Work only on branch `feature/build-calculator`. Never check out another branch, cherry-pick, rebase, push, deploy, force-push, or amend history. The external supervisor alone creates local checkpoint commits.

## Shared file ownership
- Coordinator owns planning and module interface decisions and coordinates agent dependencies. Never start a dependent worker before upstream contract is settled.
- Developer agents edit only their declared `lib/galois/` files; tester agents edit only their declared `tests/*.test.ts` files. Shared `types.ts`, `index.ts`, fixtures, and docs are coordinator-owned; serialize modifications to shared files.
- Tests are independent acceptance gates. Tester agents must provide an expected answer from a pre-approved fixture or independently justified mathematical derivation, not from the implementation under test.
- Each acceptance test must record `id`, `suite` (source file basename), `component`, `item`, `input`, `expected`, `actual`, `passed`, `note` via `tests/helpers/case-recorder.ts`. A bare Vitest PASS without input/actual is insufficient.
- The trace system is optional at runtime; it must not modify results, and without tracing it must avoid constructing detailed step representations.

## Mathematical invariants
- Work in `GF(p)[x]/(f(x))`, where `p` is prime and `f` is monic and irreducible of degree `n>=1`.
- Internal coefficients use `bigint` reduced into `[0,p-1]`; coefficient vectors are constant term first. Polynomial zero is `[0n]`; field elements have length `n` exactly, including zero padding.
- Polynomial arithmetic in `GF(p)[x]` must remain independent of reduction by `f`; field multiplication must multiply then reduce mod `f`.
- Coefficient division uses inverses in `GF(p)`. Zero-divisor and cross-field operations must fail explicitly.

## Safe autonomous work
- NEVER run `git reset --hard`, `git clean -fd`, `rm -rf`, force push, deploy, secret access/exfiltration, sudo, sandbox bypass, security-setting edits, or unreviewed network commands.
- Do not change `AGENTS.md`, `.codex/`, `scripts/supervise-codex.mjs`, `scripts/selftest-supervisor.mjs`, `vitest.config.ts`, package/lock files, or existing Slidev content during unattended runs.
- No dependency installation in unattended mode. Treat unavailable dependencies, uncertain expected values, irreconcilable math/API contracts, unexpected branch changes, and approval requests as BLOCKED.
- Do not fake command output or test results. If a required test is impossible, report failure with an exact reason and stop.
- The coordinator may request at most two bounded repair passes for a failed phase; never silently change expected values to obtain a pass.
- Run only local commands within workspace and do not call network services or modify parent directories.
- The external supervisor makes the final completion/abort decision. Its timeout/permissions/checkpoints cannot be overridden by agents.

## Subagent protocol
1. Coordinator reads the contract and agenda and delegates independent tasks to the matching custom agent by name, honoring dependency order and concurrency <=3.
2. Developer and testing agents must operate on disjoint files. Test agents review or execute the actual implementation but may not silently repair implementation.
3. Coordinator runs focused tests, records actual output, reports remaining failures and returns the workspace to supervisor.
4. When blocked, clearly say `BLOCKED: <cause>` and do not spawn replacement work to evade guardrails.
5. Only mark a task DONE after independently observed tests and successful supervisor checkpoint.

## Evidence/exit rules
- A report needs input, expected, actual, result and concise interpretation per case, plus aggregate counts. No invented actual output.
- The source of truth for process exit and preserved evidence is **supervisor-owned, outside the repository**. On anomalies, stop new work; preserve diagnostics; never revert without review.
