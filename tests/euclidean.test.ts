import { describe, test } from 'vitest'
import { extendedGcd, gcd, Polynomial, PrimeField } from '../lib/galois/index.js'
import { observeCase } from './helpers/case-recorder.js'

const suite = 'euclidean.test.ts'

function record(
  id: string,
  item: string,
  input: unknown,
  expected: unknown,
  actual: unknown,
  note: string,
): void {
  observeCase({ id, suite, component: 'algorithms', item, input, expected, actual, note })
}

function coefficients(polynomial: Polynomial): readonly bigint[] {
  return [...polynomial.coefficients]
}

function thrownName(action: () => unknown): string {
  try {
    action()
  } catch (error) {
    return error instanceof Error ? error.name : typeof error
  }
  return 'no error'
}

describe('Polynomial Euclidean algorithms', () => {
  test('returns a monic GF(2) gcd and a valid independently derived Bezout identity', () => {
    const field = new PrimeField(2n)
    const a = new Polynomial(field, [1n, 0n, 0n, 1n])
    const b = new Polynomial(field, [1n, 1n, 1n, 1n])
    const result = extendedGcd(a, b)

    record(
      'EUCLID-GCD-GF2-001',
      'monic-gcd',
      { p: 2n, a: coefficients(a), b: coefficients(b) },
      [1n, 1n],
      coefficients(result.gcd),
      'Independent factorization gives gcd(x^3+1, x^3+x^2+x+1)=x+1 over GF(2).',
    )

    const identity = result.s.mul(a).add(result.t.mul(b))
    record(
      'EUCLID-BEZOUT-GF2-001',
      'bezout-identity',
      { p: 2n, a: coefficients(a), b: coefficients(b), s: coefficients(result.s), t: coefficients(result.t) },
      coefficients(result.gcd),
      coefficients(identity),
      'The independently derived coefficients s=x and t=x+1 satisfy x*a+(x+1)*b=x+1.',
    )
  })

  test('normalizes a nonmonic GF(3) gcd and handles a zero operand', () => {
    const field = new PrimeField(3n)
    const polynomial = new Polynomial(field, [1n, 2n])
    const zero = new Polynomial(field, [0n])
    const actual = gcd(polynomial, zero)
    record(
      'EUCLID-GCD-MONIC-001',
      'monic-gcd-zero-operand',
      { p: 3n, polynomial: coefficients(polynomial), zero: [0n] },
      [2n, 1n],
      coefficients(actual),
      'A nonzero gcd is normalized to leading coefficient one, including gcd(a,0).',
    )
  })

  test('rejects gcd and extended gcd of two zero polynomials', () => {
    const field = new PrimeField(2n)
    const zero = new Polynomial(field, [0n])
    const gcdActual = thrownName(() => gcd(zero, zero))
    record('EUCLID-ERR-GCD-ZERO-001', 'gcd', { p: 2n, a: [0n], b: [0n] }, 'InvalidPolynomialError', gcdActual, 'gcd(0,0) is undefined by the API contract.')
    const extendedActual = thrownName(() => extendedGcd(zero, zero))
    record('EUCLID-ERR-XGCD-ZERO-001', 'extended-gcd', { p: 2n, a: [0n], b: [0n] }, 'InvalidPolynomialError', extendedActual, 'extendedGcd(0,0) is undefined by the API contract.')
  })

  test('rejects Euclidean operations across different characteristics', () => {
    const left = new Polynomial(new PrimeField(2n), [1n, 1n])
    const right = new Polynomial(new PrimeField(3n), [1n, 1n])
    const actual = thrownName(() => gcd(left, right))
    record('EUCLID-ERR-FIELD-001', 'gcd', { left: { p: 2n, coefficients: [1n, 1n] }, right: { p: 3n, coefficients: [1n, 1n] } }, 'IncompatibleFieldError', actual, 'Polynomial Euclidean algorithms require the same base characteristic.')
  })

  test('rejects non-polynomial operands at the public API boundary', () => {
    const field = new PrimeField(2n)
    const polynomial = new Polynomial(field, [1n, 1n])
    const invalid = null as unknown as Polynomial
    const gcdActual = thrownName(() => gcd(invalid, polynomial))
    record('EUCLID-ERR-INPUT-001', 'gcd-invalid-input', { left: null, right: { p: 2n, coefficients: [1n, 1n] } }, 'TypeError', gcdActual, 'The package export rejects a non-Polynomial operand before Euclidean arithmetic.')
    const extendedActual = thrownName(() => extendedGcd(polynomial, invalid))
    record('EUCLID-ERR-INPUT-002', 'extended-gcd-invalid-input', { left: { p: 2n, coefficients: [1n, 1n] }, right: null }, 'TypeError', extendedActual, 'The package export applies the same operand validation to extended Euclid.')
  })
})
