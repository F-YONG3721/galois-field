import { describe, test } from 'vitest'
import { Polynomial } from '../lib/galois/polynomial.js'
import { polynomialDivmod } from '../lib/galois/polynomial-division.js'
import { PrimeField } from '../lib/galois/prime-field.js'
import { observeCase } from './helpers/case-recorder.js'

const suite = 'polynomial-division.test.ts'

function record(
  id: string,
  item: string,
  input: unknown,
  expected: unknown,
  actual: unknown,
  note: string,
): void {
  observeCase({ id, suite, component: 'polynomial', item, input, expected, actual, note })
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

describe('Polynomial division', () => {
  test('matches the deterministic GF(2) quotient and remainder fixture', () => {
    const field = new PrimeField(2n)
    const dividend = new Polynomial(field, [1n, 1n, 1n, 1n])
    const divisor = new Polynomial(field, [1n, 1n, 0n, 1n])
    const result = polynomialDivmod(dividend, divisor)
    const actual = { quotient: coefficients(result.quotient), remainder: coefficients(result.remainder) }
    record('POLY-DIV-001', 'divmod', { p: 2n, dividend: [1n, 1n, 1n, 1n], divisor: [1n, 1n, 0n, 1n] }, { quotient: [1n], remainder: [0n, 0n, 1n] }, actual, 'Fixture answer from independent long division over GF(2).')
  })

  test('satisfies q*d+r identity and normalized remainder on a small GF(3) case', () => {
    const field = new PrimeField(3n)
    const dividend = new Polynomial(field, [2n, 0n, 1n, 2n, 1n])
    const divisor = new Polynomial(field, [1n, 2n, 1n])
    const result = dividend.divmod(divisor)
    const quotient = coefficients(result.quotient)
    const remainder = coefficients(result.remainder)
    const reconstructed = coefficients(result.quotient.mul(divisor).add(result.remainder))
    record('POLY-DIV-002', 'q*d+r', { p: 3n, dividend: coefficients(dividend), divisor: coefficients(divisor) }, coefficients(dividend), reconstructed, 'The division invariant is checked against the independently specified dividend.')
    record('POLY-DIV-003', 'quotient-remainder', { p: 3n, dividend: coefficients(dividend), divisor: coefficients(divisor) }, { quotient: [0n, 0n, 1n], remainder: [2n] }, { quotient, remainder }, 'Independent long division gives q=x² and r=2.')
    record('POLY-DIV-004', 'remainder-degree', { divisor: coefficients(divisor), remainder }, true, result.remainder.isZero || result.remainder.degree < divisor.degree, 'A nonzero remainder has degree strictly below the divisor degree.')
  })

  test('dividing by zero is explicitly rejected', () => {
    const field = new PrimeField(2n)
    const dividend = new Polynomial(field, [1n, 1n])
    const zero = new Polynomial(field, [0n])
    const actual = thrownName(() => polynomialDivmod(dividend, zero))
    record('POLY-DIV-ERR-ZERO-001', 'divmod', { p: 2n, dividend: [1n, 1n], divisor: [0n] }, 'InvalidPolynomialError', actual, 'The division contract rejects a zero divisor.')
  })
})
