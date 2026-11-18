import { Polynomial } from './polynomial.js'
import { polynomialDivmod } from './polynomial-division.js'
import { gcd } from './euclidean.js'
import { InvalidPolynomialError } from './types.js'

/**
 * Rabin's irreducibility test over GF(p).
 *
 * A monic polynomial f of degree n is irreducible iff x^(p^n) = x (mod f)
 * and gcd(f, x^(p^(n/q)) - x) = 1 for every prime divisor q of n.
 */
export function isIrreducible(polynomial: Polynomial): boolean {
  if (!(polynomial instanceof Polynomial)) {
    throw new TypeError('isIrreducible requires a Polynomial')
  }
  if (polynomial.degree < 1) {
    throw new InvalidPolynomialError('Irreducibility is undefined for constants')
  }
  const leading = polynomial.coefficients[polynomial.degree]
  if (leading !== 1n) {
    throw new InvalidPolynomialError('Irreducibility requires a monic polynomial')
  }

  if (polynomial.degree === 1) {
    return true
  }

  const x = new Polynomial(polynomial.field, [0n, 1n])
  const frobeniusPowers = new Map<number, Polynomial>([[0, x]])
  const frobeniusPower = (count: number): Polynomial => {
    const cached = frobeniusPowers.get(count)
    if (cached !== undefined) {
      return cached
    }
    let value = x
    for (let step = 0; step < count; step += 1) {
      value = polynomialPowerMod(value, polynomial.field.p, polynomial)
    }
    frobeniusPowers.set(count, value)
    return value
  }

  if (!frobeniusPower(polynomial.degree).equals(x)) {
    return false
  }

  for (const divisor of distinctPrimeFactors(polynomial.degree)) {
    const candidate = frobeniusPower(polynomial.degree / divisor).sub(x)
    if (gcd(polynomial, candidate).degree !== 0) {
      return false
    }
  }
  return true
}

function polynomialPowerMod(base: Polynomial, exponent: bigint, modulus: Polynomial): Polynomial {
  let factor = polynomialDivmod(base, modulus).remainder
  let power = exponent
  let result = new Polynomial(base.field, [1n])

  while (power > 0n) {
    if ((power & 1n) === 1n) {
      result = polynomialDivmod(result.mul(factor), modulus).remainder
    }
    power >>= 1n
    if (power > 0n) {
      factor = polynomialDivmod(factor.mul(factor), modulus).remainder
    }
  }
  return result
}

function distinctPrimeFactors(value: number): number[] {
  const factors: number[] = []
  let remaining = value
  for (let candidate = 2; candidate <= remaining / candidate; candidate += 1) {
    if (remaining % candidate !== 0) {
      continue
    }
    factors.push(candidate)
    while (remaining % candidate === 0) {
      remaining /= candidate
    }
  }
  if (remaining > 1) {
    factors.push(remaining)
  }
  return factors
}
