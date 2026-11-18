import {
  InvalidExponentError,
  InvalidPrimeError,
  ZeroDivisionError,
} from './types.js'

/**
 * Arithmetic in Z/pZ for a proven prime p.
 *
 * Primality is proven with deterministic Miller-Rabin for 2 <= p < 2^64,
 * using the standard seven-base witness set for the full unsigned 64-bit
 * range.  Larger moduli are outside this implementation's proven bound and
 * are rejected rather than being treated as probable primes.
 */
export class PrimeField {
  public readonly p: bigint

  constructor(p: bigint) {
    assertBigint(p, 'Prime modulus must be a bigint')
    if (!PrimeField.isPrime(p)) {
      throw new InvalidPrimeError(`Expected a prime modulus, received ${p}`)
    }
    this.p = p
  }

  normalize(a: bigint): bigint {
    assertBigint(a, 'Field values must be bigints')
    const residue = a % this.p
    return residue < 0n ? residue + this.p : residue
  }

  add(a: bigint, b: bigint): bigint {
    return this.normalize(this.normalize(a) + this.normalize(b))
  }

  sub(a: bigint, b: bigint): bigint {
    return this.normalize(this.normalize(a) - this.normalize(b))
  }

  mul(a: bigint, b: bigint): bigint {
    return this.normalize(this.normalize(a) * this.normalize(b))
  }

  neg(a: bigint): bigint {
    return this.normalize(-this.normalize(a))
  }

  inv(a: bigint): bigint {
    const value = this.normalize(a)
    if (value === 0n) {
      throw new ZeroDivisionError('Zero has no multiplicative inverse')
    }

    // Extended Euclid on integers: t*value + newT*p = gcd(value, p).
    let remainder = value
    let newRemainder = this.p
    let coefficient = 1n
    let newCoefficient = 0n

    while (newRemainder !== 0n) {
      const quotient = remainder / newRemainder
      ;[remainder, newRemainder] = [
        newRemainder,
        remainder - quotient * newRemainder,
      ]
      ;[coefficient, newCoefficient] = [
        newCoefficient,
        coefficient - quotient * newCoefficient,
      ]
    }

    // p is prime and value is nonzero, so gcd(value, p) must be one.
    if (remainder !== 1n) {
      throw new ZeroDivisionError(`Cannot invert ${a} modulo ${this.p}`)
    }
    return this.normalize(coefficient)
  }

  div(a: bigint, b: bigint): bigint {
    return this.mul(a, this.inv(b))
  }

  pow(a: bigint, exponent: bigint): bigint {
    assertBigint(exponent, 'Exponent must be a bigint')
    if (exponent < 0n) {
      throw new InvalidExponentError('PrimeField.pow requires a nonnegative exponent')
    }

    let base = this.normalize(a)
    let power = exponent
    let result = 1n % this.p
    while (power > 0n) {
      if ((power & 1n) === 1n) {
        result = this.mul(result, base)
      }
      power >>= 1n
      if (power > 0n) {
        base = this.mul(base, base)
      }
    }
    return result
  }

  private static isPrime(candidate: bigint): boolean {
    if (candidate < 2n || candidate >= 1n << 64n) {
      return false
    }
    if (candidate === 2n || candidate === 3n) {
      return true
    }
    if ((candidate & 1n) === 0n) {
      return false
    }

    let oddPart = candidate - 1n
    let powersOfTwo = 0n
    while ((oddPart & 1n) === 0n) {
      oddPart >>= 1n
      powersOfTwo += 1n
    }

    const witnesses = [
      2n,
      325n,
      9375n,
      28178n,
      450775n,
      9780504n,
      1795265022n,
    ]
    for (const witness of witnesses) {
      const base = witness % candidate
      if (base === 0n) {
        continue
      }
      let value = modularPower(base, oddPart, candidate)
      if (value === 1n || value === candidate - 1n) {
        continue
      }

      let probablyPrimeForWitness = false
      for (let round = 1n; round < powersOfTwo; round += 1n) {
        value = (value * value) % candidate
        if (value === candidate - 1n) {
          probablyPrimeForWitness = true
          break
        }
      }
      if (!probablyPrimeForWitness) {
        return false
      }
    }
    return true
  }
}

function modularPower(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let value = 1n
  let factor = base % modulus
  let power = exponent
  while (power > 0n) {
    if ((power & 1n) === 1n) {
      value = (value * factor) % modulus
    }
    power >>= 1n
    if (power > 0n) {
      factor = (factor * factor) % modulus
    }
  }
  return value
}

function assertBigint(value: unknown, message: string): asserts value is bigint {
  if (typeof value !== 'bigint') {
    throw new TypeError(message)
  }
}
