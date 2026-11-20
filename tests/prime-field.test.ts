import { describe, expect, test } from 'vitest'
import { PrimeField } from '../lib/galois/prime-field.js'
import { observeCase } from './helpers/case-recorder.js'

const suite = 'prime-field.test.ts'

function record(
  id: string,
  item: string,
  input: unknown,
  expected: unknown,
  actual: unknown,
  note: string,
): void {
  observeCase({ id, suite, component: 'prime-field', item, input, expected, actual, note })
}

function residue(value: bigint, p: bigint): bigint {
  const result = value % p
  return result < 0n ? result + p : result
}

function inverse(value: bigint, p: bigint): bigint {
  let oldR = residue(value, p)
  let r = p
  let oldS = 1n
  let s = 0n
  while (r !== 0n) {
    const quotient = oldR / r
    ;[oldR, r] = [r, oldR - quotient * r]
    ;[oldS, s] = [s, oldS - quotient * s]
  }
  return residue(oldS, p)
}

function thrownName(action: () => unknown): string {
  try {
    action()
  } catch (error) {
    return error instanceof Error ? error.name : typeof error
  }
  return 'no error'
}

describe('PrimeField', () => {
  test('exhaustively checks GF(2) normalization and binary operations', () => {
    const field = new PrimeField(2n)
    const values = [0n, 1n]

    for (const value of [-3n, -2n, -1n, 0n, 1n, 2n, 3n]) {
      const expected = residue(value, 2n)
      const actual = field.normalize(value)
      record(`PF-GF2-NORM-${value}`, 'normalize', { p: 2n, value }, expected, actual, 'Residue reduced independently into [0,p-1].')
    }

    for (const a of values) {
      for (const b of values) {
        const input = { p: 2n, a, b }
        const addition = field.add(a, b)
        record(`PF-GF2-ADD-${a}-${b}`, 'add', input, residue(a + b, 2n), addition, 'Exhaustive GF(2) addition table.')
        const subtraction = field.sub(a, b)
        record(`PF-GF2-SUB-${a}-${b}`, 'sub', input, residue(a - b, 2n), subtraction, 'Exhaustive GF(2) subtraction table.')
        const multiplication = field.mul(a, b)
        record(`PF-GF2-MUL-${a}-${b}`, 'mul', input, residue(a * b, 2n), multiplication, 'Exhaustive GF(2) multiplication table.')
      }
    }

    for (const value of values) {
      const actual = field.neg(value)
      record(`PF-GF2-NEG-${value}`, 'neg', { p: 2n, value }, residue(-value, 2n), actual, 'Additive inverse in GF(2).')
    }
  })

  test('checks GF(7) known answers, negatives, inverses, and division', () => {
    const field = new PrimeField(7n)
    const cases: Array<[string, string, bigint[], bigint, string]> = [
      ['PF-GF7-ADD-001', 'add', [3n, 6n], 2n, 'Known-answer addition.'],
      ['PF-GF7-SUB-001', 'sub', [3n, 6n], 4n, 'Subtraction modulo seven.'],
      ['PF-GF7-MUL-001', 'mul', [3n, 5n], 1n, 'Known-answer multiplication.'],
      ['PF-GF7-NEG-001', 'neg', [-3n], 3n, 'Negative input is normalized before negation.'],
      ['PF-GF7-NORM-001', 'normalize', [-1n], 6n, 'Negative residue normalization.'],
      ['PF-GF7-INV-001', 'inv', [3n], 5n, 'Known-answer inverse; 3*5 is 1 modulo seven.'],
      ['PF-GF7-DIV-001', 'div', [3n, 5n], 2n, '3 divided by 5 equals 3*3 modulo seven.'],
    ]
    for (const [id, item, input, expected, note] of cases) {
      const actual = item === 'add' ? field.add(input[0], input[1])
        : item === 'sub' ? field.sub(input[0], input[1])
          : item === 'mul' ? field.mul(input[0], input[1])
            : item === 'neg' ? field.neg(input[0])
              : item === 'normalize' ? field.normalize(input[0])
                : item === 'inv' ? field.inv(input[0])
                  : field.div(input[0], input[1])
      record(id, item, { p: 7n, values: input }, expected, actual, note)
    }
  })

  test('checks GF(11) independently derived arithmetic and every nonzero inverse', () => {
    const field = new PrimeField(11n)
    const pairs: Array<[bigint, bigint]> = [[-14n, 8n], [7n, -5n], [10n, 10n]]
    for (const [a, b] of pairs) {
      const input = { p: 11n, a, b }
      record(`PF-GF11-ADD-${a}-${b}`, 'add', input, residue(a + b, 11n), field.add(a, b), 'Independent modular addition.')
      record(`PF-GF11-MUL-${a}-${b}`, 'mul', input, residue(a * b, 11n), field.mul(a, b), 'Independent modular multiplication.')
      record(`PF-GF11-DIV-${a}-${b}`, 'div', input, residue(residue(a, 11n) * inverse(b, 11n), 11n), field.div(a, b), 'Extended-Euclidean inverse used only for expected value.')
    }
    for (let value = 1n; value < 11n; value += 1n) {
      const expected = inverse(value, 11n)
      const actual = field.inv(value)
      record(`PF-GF11-INV-${value}`, 'inv', { p: 11n, value }, expected, actual, 'All nonzero GF(11) inverses checked by independent Euclid.')
    }
  })

  test('rejects zero inversion and division by zero', () => {
    const field = new PrimeField(7n)
    const invActual = thrownName(() => field.inv(0n))
    record('PF-ERR-INV-ZERO-001', 'inv', { p: 7n, value: 0n }, 'ZeroDivisionError', invActual, 'Zero has no multiplicative inverse.')
    const divActual = thrownName(() => field.div(3n, 0n))
    record('PF-ERR-DIV-ZERO-001', 'div', { p: 7n, numerator: 3n, denominator: 0n }, 'ZeroDivisionError', divActual, 'Division by zero is explicitly rejected.')
  })

  test('rejects invalid prime characteristics', () => {
    for (const p of [0n, 1n, 4n, 8n, -7n]) {
      const actual = thrownName(() => new PrimeField(p))
      record(`PF-ERR-PRIME-${p}`, 'constructor', { p }, 'InvalidPrimeError', actual, 'Characteristic must be a proven prime integer >= 2.')
    }
  })
})
