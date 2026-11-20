import { describe, test } from 'vitest'
import { ExtensionField, Polynomial, PrimeField } from '../lib/galois/index.js'
import { observeCase } from './helpers/case-recorder.js'

const suite = 'extension-field.test.ts'
function record(id: string, item: string, input: unknown, expected: unknown, actual: unknown, note: string): void {
  observeCase({ id, suite, component: 'finite-field', item, input, expected, actual, note })
}
function vec(value: { coefficients: readonly bigint[] }): bigint[] { return [...value.coefficients] }
function thrownName(action: () => unknown): string {
  try { action() } catch (error) { return error instanceof Error ? error.name : typeof error }
  return 'no error'
}

describe('ExtensionField construction and canonical elements', () => {
  test('constructs GF(8) and verifies the known reduction product', () => {
    const base = new PrimeField(2n)
    const field = new ExtensionField(base, new Polynomial(base, [1n, 1n, 0n, 1n]))
    const actual = vec(field.element([1n, 0n, 1n]).mul(field.element([1n, 1n, 0n])))
    record('FF-GF8-MUL-001', 'multiply', { p: 2n, modulus: [1n, 1n, 0n, 1n], left: [1n, 0n, 1n], right: [1n, 1n, 0n] }, [0n, 0n, 1n], actual, 'Known product in GF(2)[x]/(x^3+x+1).')
    record('FF-GF8-CANON-001', 'canonical-length', { degree: 3, input: [0n, 0n, 0n, 1n, 1n] }, 3, field.element([0n, 0n, 0n, 1n, 1n]).coefficients.length, 'Elements are reduced and padded to exactly the modulus degree.')
  })

  test('constructs GF(9) and verifies an independently derived inverse', () => {
    const base = new PrimeField(3n)
    const field = new ExtensionField(base, new Polynomial(base, [1n, 0n, 1n]))
    const value = field.element([1n, 1n])
    const actual = vec(value.inv())
    record('FF-GF9-INV-001', 'inverse', { p: 3n, modulus: [1n, 0n, 1n], value: [1n, 1n] }, [2n, 1n], actual, '(1+x)(2+x)=2+0x modulo x^2+1, so the inverse is 2(1+x)=2+2x? Correction: (1+x)(2+x)=2+3x+x^2=1, hence inverse [2,1].')
    record('FF-GF9-ORDER-001', 'order', { p: 3n, degree: 2 }, 9n, field.order, 'A degree-two extension of GF(3) has 3^2 elements.')
  })

  test('accepts GF(7) as a degree-one extension and rejects invalid moduli', () => {
    const base = new PrimeField(7n)
    const field = new ExtensionField(base, new Polynomial(base, [0n, 1n]))
    record('FF-GF7-ELEMENT-001', 'element', { p: 7n, modulus: [0n, 1n], input: [10n] }, [3n], vec(field.element([10n])), 'Degree-one extension agrees with residues modulo seven.')
    record('FF-GF7-ONE-001', 'one', { p: 7n, modulus: [0n, 1n] }, [1n], vec(field.one()), 'The multiplicative identity is the constant polynomial one.')
    const nonmonic = thrownName(() => new ExtensionField(base, new Polynomial(base, [1n, 2n])))
    record('FF-ERR-MODULUS-NONMONIC-001', 'constructor', { p: 7n, modulus: [1n, 2n] }, 'InvalidModulusError', nonmonic, 'Extension moduli must be monic.')
    const reducible = thrownName(() => new ExtensionField(new PrimeField(2n), new Polynomial(new PrimeField(2n), [1n, 0n, 1n])))
    record('FF-ERR-MODULUS-REDUCIBLE-001', 'constructor', { p: 2n, modulus: [1n, 0n, 1n] }, 'InvalidModulusError', reducible, 'x^2+1=(x+1)^2 over GF(2) is reducible.')
  })
})
