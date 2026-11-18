import { describe, test } from 'vitest'
import { Polynomial } from '../lib/galois/polynomial.js'
import { PrimeField } from '../lib/galois/prime-field.js'
import { observeCase } from './helpers/case-recorder.js'

const suite = 'polynomial.test.ts'

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

describe('Polynomial', () => {
  test('normalizes coefficients, strips leading zeros, and canonicalizes zero', () => {
    const field = new PrimeField(5n)
    const cases: Array<[string, readonly bigint[], readonly bigint[], string]> = [
      ['POLY-NORM-001', [7n, -1n, 10n, 0n, 0n], [2n, 4n], 'Reduce each coefficient modulo five and strip high zero coefficients.'],
      ['POLY-NORM-002', [], [0n], 'Empty input is the canonical zero polynomial.'],
      ['POLY-NORM-003', [-5n, 0n, 0n], [0n], 'An all-zero polynomial is represented by exactly [0n].'],
    ]

    for (const [id, input, expected, note] of cases) {
      const actual = coefficients(new Polynomial(field, input))
      record(id, 'normalization', { p: 5n, coefficients: input }, expected, actual, note)
    }
  })

  test('handles zero, addition, subtraction, and negation independently', () => {
    const field = new PrimeField(5n)
    const zero = new Polynomial(field, [0n])
    const a = new Polynomial(field, [4n, 3n, 0n, 1n])
    const b = new Polynomial(field, [2n, 4n, 1n])

    record('POLY-ZERO-001', 'zero', { p: 5n, coefficients: [0n] }, true, zero.isZero, 'The canonical zero polynomial reports isZero=true.')
    record('POLY-ZERO-002', 'zero-additive-identity', { a: coefficients(a), zero: [0n] }, coefficients(a), coefficients(a.add(zero)), 'Adding zero leaves every coefficient unchanged.')
    record('POLY-ADD-001', 'add', { p: 5n, a: coefficients(a), b: coefficients(b) }, [1n, 2n, 1n, 1n], coefficients(a.add(b)), 'Coefficientwise addition modulo five, independently derived.')
    record('POLY-SUB-001', 'sub', { p: 5n, a: coefficients(a), b: coefficients(b) }, [2n, 4n, 4n, 1n], coefficients(a.sub(b)), 'Coefficientwise subtraction modulo five, independently derived.')
    record('POLY-NEG-001', 'neg', { p: 5n, a: coefficients(a) }, [1n, 2n, 0n, 4n], coefficients(a.neg()), 'Each coefficient is replaced by its additive inverse modulo five.')
  })

  test('multiplies by convolution modulo the base characteristic', () => {
    const field = new PrimeField(2n)
    const left = new Polynomial(field, [1n, 0n, 1n])
    const right = new Polynomial(field, [1n, 1n])
    const actual = coefficients(left.mul(right))
    record('POLY-MUL-001', 'multiply', { p: 2n, left: [1n, 0n, 1n], right: [1n, 1n] }, [1n, 1n, 1n, 1n], actual, 'Fixture answer: (1+x²)(1+x)=1+x+x²+x³ over GF(2).')
  })

  test('rejects polynomial operations across different characteristics', () => {
    const left = new Polynomial(new PrimeField(2n), [1n, 1n])
    const right = new Polynomial(new PrimeField(3n), [1n])
    const actual = thrownName(() => left.add(right))
    record('POLY-ERR-FIELD-001', 'add', { left: { p: 2n, coefficients: [1n, 1n] }, right: { p: 3n, coefficients: [1n] } }, 'IncompatibleFieldError', actual, 'Polynomial arithmetic requires equal base characteristics.')
  })
})
