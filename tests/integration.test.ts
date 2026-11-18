import { describe, test } from 'vitest'
import { ExtensionField, Polynomial, PrimeField, TraceRecorder } from '../lib/galois/index.js'
import { observeCase } from './helpers/case-recorder.js'

const suite = 'integration.test.ts'
function record(id: string, item: string, input: unknown, expected: unknown, actual: unknown, note: string): void {
  observeCase({ id, suite, component: 'finite-field', item, input, expected, actual, note })
}
function vec(value: { coefficients: readonly bigint[] }): bigint[] { return [...value.coefficients] }
function seeded(seed: number): number { return (seed * 1664525 + 1013904223) >>> 0 }

describe('Finite-field integration samples', () => {
  test('runs deterministic seeded GF(49) samples with independent polynomial arithmetic', () => {
    const p = new PrimeField(7n); const field = new ExtensionField(p, new Polynomial(p, [1n, 0n, 1n])); let seed = 0x51f15e
    const samples: Array<{ a: bigint[]; b: bigint[]; expected: bigint[] }> = []
    for (let i = 0; i < 6; i += 1) { seed = seeded(seed); const a0 = BigInt(seed % 7); seed = seeded(seed); const a1 = BigInt(seed % 7); seed = seeded(seed); const b0 = BigInt(seed % 7); seed = seeded(seed); const b1 = BigInt(seed % 7)
      // In x^2+1=0, (a0+a1x)(b0+b1x)=(a0b0-a1b1)+(a0b1+a1b0)x mod 7.
      samples.push({ a: [a0, a1], b: [b0, b1], expected: [(a0 * b0 - a1 * b1 + 49n) % 7n, (a0 * b1 + a1 * b0) % 7n] }) }
    for (const [index, sample] of samples.entries()) record(`INT-GF49-MUL-${index + 1}`, 'seeded multiplication', { seed: '0x51f15e', sample: index + 1, a: sample.a, b: sample.b }, sample.expected, vec(field.element(sample.a).mul(field.element(sample.b))), 'Six reproducible GF(49) products from an independent closed-form derivation.')
    record('INT-GF49-EXHAUSTIVE-INV-001', 'inverse nonzero', { p: 7n, modulus: [1n, 0n, 1n], checked: 48 }, true, (() => { for (let a0 = 0n; a0 < 7n; a0++) for (let a1 = 0n; a1 < 7n; a1++) { const a = field.element([a0, a1]); if (!a.equals(field.zero()) && !a.mul(a.inv()).equals(field.one())) return false } return true })(), 'All 48 nonzero GF(49) elements satisfy a*a^-1=1.')
  })

  test('checks a mixed-field application flow and explicit mismatch rejection', () => {
    const p = new PrimeField(2n); const first = new ExtensionField(p, new Polynomial(p, [1n, 1n, 0n, 1n])); const second = new ExtensionField(p, new Polynomial(p, [1n, 0n, 1n, 1n]))
    const input = first.element([1n, 1n, 1n]); const transformed = input.mul(input).add(first.one())
    record('INT-GF8-FLOW-001', 'composed arithmetic', { value: [1n, 1n, 1n], operation: 'a^2+1' }, [0n, 1n, 0n], vec(transformed), 'Integration flow combines multiplication and addition in one settled field.')
    let mismatch = 'no error'; try { first.element([1n]).div(second.element([1n])) } catch (error) { mismatch = error instanceof Error ? error.name : typeof error }
    record('INT-CROSS-FIELD-DIV-001', 'mismatched division', { left: 'x^3+x+1', right: 'x^3+x^2+1' }, 'IncompatibleFieldError', mismatch, 'Values from different extension constructions cannot be divided.')
  })

  test('accepts equivalent extension definitions through the public API', () => {
    const firstBase = new PrimeField(2n)
    const secondBase = new PrimeField(2n)
    const first = new ExtensionField(firstBase, new Polynomial(firstBase, [1n, 1n, 0n, 1n]))
    const second = new ExtensionField(secondBase, new Polynomial(secondBase, [1n, 1n, 0n, 1n]))
    const left = first.element([1n, 0n, 1n])
    const right = second.element([1n, 1n, 0n])
    const recorder = new TraceRecorder()
    const actual = [...left.add(right, { trace: recorder.asSink() }).coefficients]
    record('INT-EQUIVALENT-FIELD-001', 'equivalent-construction-add', { modulus: [1n, 1n, 0n, 1n], left: [1n, 0n, 1n], right: [1n, 1n, 0n] }, [0n, 1n, 1n], actual, 'Equivalent base/modulus definitions are compatible even when instantiated separately.')
    record('INT-INDEX-TRACE-001', 'trace-recorder-export', { steps: recorder.steps.length }, 1, recorder.steps.length, 'TraceRecorder is reachable from the package public index.')
  })
})
