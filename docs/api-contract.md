# API contract — freeze at P0 before parallel coding

This is a **normative minimum**; the coordinator resolves details in P0 and may add methods if needed, but must retain existing exports and the validated math contract. Types: `bigint` for coefficient scalars, `readonly bigint[]` for caller arrays; defensive copies to avoid mutation. Public methods return new values.

## PrimeField (`prime-field.ts`)
- `new PrimeField(p: bigint)` validates prime `p` (deterministic/probable primality policy and supported bounds documented by implementer).
- `normalize(a: bigint): bigint`; `add(a,b)`, `sub(a,b)`, `mul(a,b)`, `neg(a)`, `inv(a)`, `div(a,b)`, `pow(a,k)`; `p: bigint` readonly.

## Polynomial (`polynomial.ts`) and division (`polynomial-division.ts`)
- `new Polynomial(field: PrimeField, coefficients: readonly bigint[])` canonicalizes array; `coefficients: readonly bigint[]`, `degree`, `isZero`, `add(b)`, `sub(b)`, `neg()`, `mul(b)`, `equals(b)`. Validate same base characteristic.
- `divmod(divisor): { quotient: Polynomial; remainder: Polynomial }`, or an exported `polynomialDivmod(dividend,divisor)` with a compatible wrapper. Division by zero throws.
- `gcd(a,b)` and `extendedGcd(a,b): { gcd, s, t }` as pure exports from `euclidean.ts` (can be exposed through class wrappers).
- `isIrreducible(f): boolean` from `irreducible.ts`; no exponential naive factor enumeration for large polynomials.

## ExtensionField / FieldElement
- `new ExtensionField(base: PrimeField, modulus: Polynomial)` validates monic irreducible, derives `n`, and caches order `base.p**BigInt(n)`.
- `element(coefficients: readonly bigint[]): FieldElement` accepts input polynomial (possibly longer) then reduces mod modulus; `zero()` and `one()`.
- `FieldElement` readonly `field: ExtensionField`, `coefficients: readonly bigint[]` **length exactly n**, `add(b)`, `sub(b)`, `neg()`, `mul(b)`, `inv()`, `div(b)`, `pow(k)` and `equals(b)`; reject different construction definitions unless proven compatible via explicitly defined equality.
- `index.ts` exports all public abstractions and types.

## Structured tracing
- `TraceSink` accepts machine-readable `TraceStep` records: operation name, operands, intermediate polynomial arrays, and associated modulus when relevant. No LaTeX serialization inside core.
- Prefer an optional sink argument in operations or a lightweight operation context. No-step path must avoid making trace payloads.
- A reduction trace records raw product and polynomial-division quotient/remainder before final normalized field result.

## Error semantics
- Invalid prime, invalid polynomial divisor, irreducible validation failure, zero inverse, incompatible fields -> throw specific `Error` subtypes or documented errors. Define stable error names and add matching tests in P0.
- No network, filesystem, UI imports from `lib/galois`.
- If P0 discovers a discrepancy in this contract, do not change math axioms to accommodate code; declare blocker if no safe resolution is possible.
