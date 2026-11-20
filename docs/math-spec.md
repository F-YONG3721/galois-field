# Normative mathematical specification

## Objects
- `p` must be prime (integer >=2); for large `bigint` inputs where primality cannot be proven under the documented algorithm, fail explicitly rather than silently treating a probable prime as proven prime. `GF(p)=Z/pZ` with residues `0..p-1` represented by `bigint`.
- For `n>=1`, choose a **monic irreducible** polynomial `f(x)` of degree `n` over `GF(p)`.
- The resulting field is `GF(p)[x]/(f(x))`, with `p^n` elements. No canonical identification exists between representations using different `f` without an explicit isomorphism.
- `Polynomial` coefficient arrays are **little-endian**: `[a0,a1,...,am]` represents sum of `ai*x^i`. Normalize coefficients modulo `p` and remove high zero coefficients; zero polynomial exactly `[0n]`.
- A field element is a canonical representative with degree `<n`, serialized internally as length-`n` coefficient vector (zero-padded).

## Operations
- Base addition/subtraction/multiplication modulo `p`; invert nonzero `a` using integer extended Euclid or equivalent validated method.
- Polynomial add/subtract coefficientwise; polynomial product by convolution and modulo `p`; quotient/remainder via leading-coefficient inverse. For nonzero divisor `d`, `a=q*d+r` with `r=0` or `deg(r)<deg(d)`.
- `gcd(a,b)` is normalized monic for at least one nonzero polynomial. Extended Euclid returns `(g,s,t)` satisfying `s*a+t*b=g` over `GF(p)[x]`.
- Irreducibility: reject constants and reducible polynomials. For monic degree `n`, apply a mathematically sound finite-field criterion (e.g. Rabin's test), using polynomial modular powering; include `n=1`.
- Field add and sub coefficientwise. Field multiply: polynomial product, then remainder modulo `f`. Inverse of nonzero `a` is the polynomial inverse mod `f`, via extended Euclid. Division means multiplication by inverse. Exponentiation is by repeated squaring with nonnegative `bigint` exponents (negative exponents allowed only if explicitly implemented and tested).
- Reject zero inverse/zero denominator and operations between **incompatible field definitions**. Never silently coerce unrelated field representations.
- Optional traces must reflect actual intermediates and must not change mathematical results.

## Known-answer examples (constant-term-first)
- `GF(7)`: `3+6=2`; `3*5=1`; `inv(3)=5`.
- `GF(2)[x]`: `(x^2+1)(x+1)=x^3+x^2+x+1` => `[1,1,1,1]`.
- In `GF(8)=GF(2)[x]/(x^3+x+1)`, modulus `[1,1,0,1]`: `[1,0,1]*[1,1,0]=[0,0,1]`.
- `GF(2)`: `x^2+1=(x+1)^2` reducible, while `x^2+x+1` irreducible.
- `GF(3)`: `x^2+1` irreducible since its evaluation at `0,1,2` is never `0`.

## Validation expectations
- Exhaustive laws for fields up to at least `GF(2^3)` and `GF(3^2)`; deterministic seeded samples for larger ones.
- Tests for arithmetic errors, invalid `p`, nonmonic/reducible modulus, padding, negative input normalization, and mixing different constructions.
- Define unambiguous errors in `api-contract.md` before parallel implementation. No silent expected-result changes.
