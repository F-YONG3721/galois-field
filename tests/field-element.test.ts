import { describe, test } from 'vitest'
import { ExtensionField, Polynomial, PrimeField } from '../lib/galois/index.js'
import { observeCase } from './helpers/case-recorder.js'

const suite = 'field-element.test.ts'
function record(id: string, item: string, input: unknown, expected: unknown, actual: unknown, note: string): void {
  observeCase({ id, suite, component: 'finite-field', item, input, expected, actual, note })
}
function vec(value: { coefficients: readonly bigint[] }): bigint[] { return [...value.coefficients] }
function thrownName(action: () => unknown): string {
  try { action() } catch (error) { return error instanceof Error ? error.name : typeof error }
  return 'no error'
}

describe('FieldElement arithmetic and errors', () => {
  const gf8 = () => { const p = new PrimeField(2n); return new ExtensionField(p, new Polynomial(p, [1n, 1n, 0n, 1n])) }

  test('checks GF(8) additive, multiplicative, and exponent identities', () => {
    const field = gf8(); const a = field.element([1n, 0n, 1n]); const b = field.element([1n, 1n, 0n])
    record('FE-GF8-ADD-001', 'add', { a: [1n, 0n, 1n], b: [1n, 1n, 0n] }, [0n, 1n, 1n], vec(a.add(b)), 'Coefficientwise addition over GF(2).')
    record('FE-GF8-SUB-001', 'sub', { a: [1n, 0n, 1n], b: [1n, 1n, 0n] }, [0n, 1n, 1n], vec(a.sub(b)), 'Subtraction equals addition in characteristic two.')
    record('FE-GF8-NEG-001', 'neg', { a: [1n, 0n, 1n] }, [1n, 0n, 1n], vec(a.neg()), 'Every element is its own additive inverse in characteristic two.')
    record('FE-GF8-POW-001', 'pow', { a: [1n, 0n, 1n], exponent: 0n }, [1n, 0n, 0n], vec(a.pow(0n)), 'The zeroth power of a nonzero element is one.')
    record('FE-GF8-DIV-001', 'div', { numerator: [1n, 0n, 1n], denominator: [1n, 1n, 0n] }, [1n, 1n, 0n], vec(a.div(b)), 'Independent division result: (1+x^2)/(1+x)=1+x modulo x^3+x+1.')
  })

  test('rejects zero inverse and incompatible field constructions', () => {
    const p = new PrimeField(2n)
    const left = new ExtensionField(p, new Polynomial(p, [1n, 1n, 0n, 1n]))
    const right = new ExtensionField(p, new Polynomial(p, [1n, 0n, 1n, 1n]))
    const zeroInverse = thrownName(() => left.zero().inv())
    record('FE-ERR-INV-ZERO-001', 'inverse', { field: 'GF(8)', value: [0n, 0n, 0n] }, 'ZeroDivisionError', zeroInverse, 'Zero has no multiplicative inverse.')
    const crossAdd = thrownName(() => left.one().add(right.one()))
    record('FE-ERR-CROSS-FIELD-ADD-001', 'add', { leftModulus: [1n, 1n, 0n, 1n], rightModulus: [1n, 0n, 1n, 1n] }, 'IncompatibleFieldError', crossAdd, 'Equal characteristics do not make distinct extension constructions compatible.')
    const crossMul = thrownName(() => left.element([1n, 1n]).mul(right.element([1n, 1n])))
    record('FE-ERR-CROSS-FIELD-MUL-001', 'multiply', { leftModulus: [1n, 1n, 0n, 1n], rightModulus: [1n, 0n, 1n, 1n] }, 'IncompatibleFieldError', crossMul, 'Cross-construction multiplication must fail explicitly.')
  })
})
