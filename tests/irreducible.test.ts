import { describe, test } from 'vitest'
import { isIrreducible } from '../lib/galois/irreducible.js'
import { Polynomial } from '../lib/galois/polynomial.js'
import { PrimeField } from '../lib/galois/prime-field.js'
import { observeCase } from './helpers/case-recorder.js'

const suite = 'irreducible.test.ts'

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

function thrownName(action: () => unknown): string {
  try {
    action()
  } catch (error) {
    return error instanceof Error ? error.name : typeof error
  }
  return 'no error'
}

describe('Polynomial irreducibility', () => {
  test('accepts approved irreducible examples over GF(2) and GF(3)', () => {
    const cases: Array<[string, bigint, readonly bigint[], string]> = [
      ['IRR-001', 2n, [1n, 1n, 1n], 'Approved GF(2) quadratic fixture; it has no root in GF(2).'],
      ['IRR-003', 3n, [1n, 0n, 1n], 'Approved GF(3) quadratic fixture; evaluations at 0, 1, and 2 are nonzero.'],
      ['IRR-GF2-DEG3-001', 2n, [1n, 1n, 0n, 1n], 'Independent Rabin criterion example x^3+x+1 over GF(2).'],
    ]
    for (const [id, p, coefficients, note] of cases) {
      const polynomial = new Polynomial(new PrimeField(p), coefficients)
      const actual = isIrreducible(polynomial)
      record(id, 'irreducible', { p, coefficients }, true, actual, note)
    }
  })

  test('rejects approved reducible examples', () => {
    const cases: Array<[string, bigint, readonly bigint[], string]> = [
      ['IRR-002', 2n, [1n, 0n, 1n], 'Approved GF(2) fixture: x^2+1=(x+1)^2.'],
      ['IRR-GF3-RED-001', 3n, [2n, 0n, 1n], 'Over GF(3), x^2+2=(x+1)(x+2), so it is reducible.'],
    ]
    for (const [id, p, coefficients, note] of cases) {
      const polynomial = new Polynomial(new PrimeField(p), coefficients)
      const actual = isIrreducible(polynomial)
      record(id, 'reducible', { p, coefficients }, false, actual, note)
    }
  })

  test('rejects constants and nonmonic candidates as invalid moduli', () => {
    const field = new PrimeField(3n)
    const cases: Array<[string, readonly bigint[], string]> = [
      ['IRR-ERR-CONSTANT-001', [1n], 'Irreducibility is defined here only for degree at least one.'],
      ['IRR-ERR-NONMONIC-001', [1n, 1n, 2n], 'A modulus must be monic; leading coefficient 2 is not one in GF(3).'],
    ]
    for (const [id, coefficients, note] of cases) {
      const actual = thrownName(() => isIrreducible(new Polynomial(field, coefficients)))
      record(id, 'invalid-modulus', { p: 3n, coefficients }, 'InvalidPolynomialError', actual, note)
    }
  })
})
