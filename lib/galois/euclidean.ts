import { Polynomial } from './polynomial.js'
import { IncompatibleFieldError, InvalidPolynomialError } from './types.js'
import type { ExtendedGcdResult } from './types.js'

/** The monic greatest common divisor in GF(p)[x]. */
export function gcd(a: Polynomial, b: Polynomial): Polynomial {
  return extendedGcd(a, b).gcd
}

/**
 * Extended Euclid in GF(p)[x].  The returned coefficients satisfy
 * s*a + t*b = gcd(a, b), with the gcd normalized to be monic.
 */
export function extendedGcd(a: Polynomial, b: Polynomial): ExtendedGcdResult<Polynomial> {
  assertPolynomials(a, b)
  if (a.isZero && b.isZero) {
    throw new InvalidPolynomialError('gcd(0, 0) is undefined')
  }

  const zero = new Polynomial(a.field, [0n])
  const one = new Polynomial(a.field, [1n])
  let oldR = a
  let r = b
  let oldS = one
  let s = zero
  let oldT = zero
  let t = one

  while (!r.isZero) {
    const division = oldR.divmod(r)
    ;[oldR, r] = [r, division.remainder]
    ;[oldS, s] = [s, oldS.sub(division.quotient.mul(s))]
    ;[oldT, t] = [t, oldT.sub(division.quotient.mul(t))]
  }

  const leading = oldR.coefficients[oldR.degree]
  const scale = a.field.inv(leading)
  return {
    gcd: scalePolynomial(oldR, scale),
    s: scalePolynomial(oldS, scale),
    t: scalePolynomial(oldT, scale),
  }
}

function scalePolynomial(value: Polynomial, scalar: bigint): Polynomial {
  return new Polynomial(value.field, value.coefficients.map((coefficient) => (
    value.field.mul(coefficient, scalar)
  )))
}

function assertPolynomials(a: Polynomial, b: Polynomial): void {
  if (!(a instanceof Polynomial) || !(b instanceof Polynomial)) {
    throw new TypeError('gcd requires Polynomial operands')
  }
  if (a.field.p !== b.field.p) {
    throw new IncompatibleFieldError(
      `Polynomials must have the same base characteristic (${a.field.p} and ${b.field.p})`,
    )
  }
}
