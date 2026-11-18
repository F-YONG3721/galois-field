import { describe, test } from 'vitest'
import { ExtensionField, Polynomial, PrimeField } from '../lib/galois/index.js'
import { observeCase } from './helpers/case-recorder.js'

const suite = 'properties.test.ts'
function record(id: string, item: string, input: unknown, expected: unknown, actual: unknown, note: string): void {
  observeCase({ id, suite, component: 'finite-field', item, input, expected, actual, note })
}
function elements(field: ExtensionField, order: number): ReturnType<ExtensionField['element']>[] {
  return Array.from({ length: order }, (_, index) => field.element([BigInt(index & 1), BigInt((index >> 1) & 1), BigInt((index >> 2) & 1)]))
}

describe('Finite-field laws', () => {
  test('exhaustively checks GF(8) additive and multiplicative laws', () => {
    const p = new PrimeField(2n); const field = new ExtensionField(p, new Polynomial(p, [1n, 1n, 0n, 1n])); const all = elements(field, 8)
    let additiveIdentity = true; let additiveInverse = true; let distributive = true; let associative = true; let nonzeroInverse = true; let closure = true
    for (const a of all) {
      additiveIdentity &&= a.add(field.zero()).equals(a)
      additiveInverse &&= a.add(a.neg()).equals(field.zero())
      nonzeroInverse &&= a.equals(field.zero()) || a.mul(a.inv()).equals(field.one())
      closure &&= a.coefficients.length === 3 && a.coefficients.every(value => value >= 0n && value < 2n)
      for (const b of all) for (const c of all) {
        distributive &&= a.mul(b.add(c)).equals(a.mul(b).add(a.mul(c)))
        associative &&= a.mul(b).mul(c).equals(a.mul(b.mul(c)))
      }
    }
    record('PROP-GF8-ADD-ID-001', 'additive identity', { order: 8, exhaustive: true }, true, additiveIdentity, 'All eight elements satisfy a+0=a.')
    record('PROP-GF8-ADD-INV-001', 'additive inverse', { order: 8, exhaustive: true }, true, additiveInverse, 'All eight elements satisfy a+(-a)=0.')
    record('PROP-GF8-DIST-001', 'distributivity', { order: 8, exhaustive: true, triples: 512 }, true, distributive, 'All triples satisfy a(b+c)=ab+ac.')
    record('PROP-GF8-ASSOC-001', 'multiplicative associativity', { order: 8, exhaustive: true, triples: 512 }, true, associative, 'All triples satisfy (ab)c=a(bc).')
    record('PROP-GF8-INV-001', 'inverse nonzero', { order: 8, exhaustive: true }, true, nonzeroInverse, 'Every nonzero element has a multiplicative inverse.')
    record('PROP-GF8-CLOSURE-001', 'closure', { order: 8, exhaustive: true }, true, closure, 'Canonical results remain length-three GF(2) vectors.')
  })

  test('exhaustively checks GF(9) inverse and closure laws', () => {
    const p = new PrimeField(3n); const field = new ExtensionField(p, new Polynomial(p, [1n, 0n, 1n])); let inverses = true; let closure = true
    for (let a0 = 0n; a0 < 3n; a0++) for (let a1 = 0n; a1 < 3n; a1++) { const a = field.element([a0, a1]); closure &&= a.coefficients.length === 2 && a.coefficients.every(value => value >= 0n && value < 3n); if (!a.equals(field.zero())) inverses &&= a.mul(a.inv()).equals(field.one()) }
    record('PROP-GF9-INV-001', 'inverse nonzero', { order: 9, exhaustive: true }, true, inverses, 'Every one of the eight nonzero elements in GF(9) inverts.')
    record('PROP-GF9-CLOSURE-001', 'closure', { order: 9, exhaustive: true }, true, closure, 'All canonical GF(9) vectors have length two and residues 0..2.')
  })
})
