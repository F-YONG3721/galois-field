import { describe, test } from 'vitest'
import { ExtensionField } from '../lib/galois/extension-field.js'
import { FieldElement } from '../lib/galois/field-element.js'
import { Polynomial } from '../lib/galois/polynomial.js'
import { PrimeField } from '../lib/galois/prime-field.js'
import { TraceRecorder } from '../lib/galois/trace/recorder.js'
import { observeCase } from './helpers/case-recorder.js'

const suite = 'trace.test.ts'

function record(id: string, item: string, input: unknown, expected: unknown, actual: unknown, note: string): void {
  observeCase({ id, suite, component: 'trace', item, input, expected, actual, note })
}

function coefficients(element: FieldElement): readonly bigint[] {
  return [...element.coefficients]
}

function traceCase(): { left: FieldElement; right: FieldElement; modulus: readonly bigint[] } {
  const base = new PrimeField(2n)
  const modulus = new Polynomial(base, [1n, 1n, 0n, 1n])
  const field = new ExtensionField(base, modulus)
  return {
    left: field.element([1n, 0n, 1n]),
    right: field.element([1n, 1n, 0n]),
    modulus: [...modulus.coefficients],
  }
}

describe('structured operation tracing', () => {
  test('disabled tracing emits no steps and preserves the result', () => {
    const { left, right } = traceCase()
    const recorder = new TraceRecorder()
    const result = left.mul(right)

    record('TRACE-DISABLED-001', 'disabled-step-count', { p: 2n, left: coefficients(left), right: coefficients(right) }, 0, recorder.steps.length, 'Omitting trace options must not publish any trace steps.')
    record('TRACE-DISABLED-002', 'disabled-result', { p: 2n, left: [1n, 0n, 1n], right: [1n, 1n, 0n] }, [0n, 0n, 1n], coefficients(result), 'The independent GF(8) fixture gives x² after reduction by x³+x+1.')
  })

  test('enabled tracing publishes the deterministic multiplication reduction step', () => {
    const { left, right, modulus } = traceCase()
    const recorder = new TraceRecorder()
    const result = left.mul(right, { trace: recorder.asSink() })
    const actual = recorder.steps.map((step) => ({ operation: step.operation, operands: step.operands, intermediates: step.intermediates, modulus: step.modulus }))

    record('TRACE-ENABLED-001', 'step-order-and-payload', { p: 2n, left: coefficients(left), right: coefficients(right), modulus }, [{
      operation: 'field-mul',
      operands: [[1n, 0n, 1n], [1n, 1n, 0n]],
      intermediates: { rawProduct: [1n, 1n, 1n, 1n], quotient: [1n], remainder: [0n, 0n, 1n], result: [0n, 0n, 1n] },
      modulus: [1n, 1n, 0n, 1n],
    }], actual, 'GF(8) multiplication emits one ordered step with the raw product, reduction chain, canonical result, and modulus.')
    record('TRACE-ENABLED-002', 'enabled-result', { p: 2n, left: coefficients(left), right: coefficients(right) }, [0n, 0n, 1n], coefficients(result), 'Tracing must preserve the independently derived GF(8) multiplication result.')
  })

  test('the enabled reduction chain is mathematically valid and result-invariant', () => {
    const { left, right, modulus } = traceCase()
    const tracedRecorder = new TraceRecorder()
    const traced = left.mul(right, { trace: tracedRecorder.asSink() })
    const untraced = left.mul(right)
    const step = tracedRecorder.steps[0]
    const intermediates = step.intermediates
    const base = new PrimeField(2n)
    const divisor = new Polynomial(base, modulus)
    const quotient = new Polynomial(base, intermediates?.quotient ?? [])
    const remainder = new Polynomial(base, intermediates?.remainder ?? [])
    const reconstructed = quotient.mul(divisor).add(remainder)

    record('TRACE-CHAIN-001', 'reduction-chain', { quotient: [1n], divisor: modulus, remainder: [0n, 0n, 1n] }, [1n, 1n, 1n, 1n], [...reconstructed.coefficients], 'The reported quotient and remainder satisfy rawProduct = quotient*modulus + remainder.')
    record('TRACE-INVARIANT-001', 'result-invariant', { p: 2n, left: [1n, 0n, 1n], right: [1n, 1n, 0n] }, [0n, 0n, 1n], coefficients(traced), 'Enabling a sink must not alter the multiplication result.')
    record('TRACE-INVARIANT-002', 'untraced-match', { traced: coefficients(traced), untraced: coefficients(untraced) }, [0n, 0n, 1n], coefficients(untraced), 'The independently run disabled path returns the same canonical field element.')
  })
})
