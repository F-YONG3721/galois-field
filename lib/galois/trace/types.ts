import type {
  Coefficients,
  TraceOptions,
  TraceSink,
  TraceStep,
  TraceValue,
} from '../types.js'

/** Input used to construct a defensive, immutable trace record. */
export interface TraceStepInput {
  readonly operation: string
  readonly operands: readonly TraceValue[]
  readonly intermediates?: Readonly<Record<string, Coefficients>>
  readonly modulus?: Coefficients
}

/** A trace event sink, repeated here for consumers of the trace module. */
export type {
  Coefficients,
  TraceOptions,
  TraceSink,
  TraceStep,
  TraceValue,
}

/**
 * Construct a trace step with defensive copies of every coefficient vector.
 * Callers should only invoke this when tracing is enabled; the arithmetic
 * layers can therefore keep the disabled path free of trace allocations.
 */
export function createTraceStep(input: TraceStepInput): TraceStep {
  const operands = input.operands.map(copyTraceValue)
  const intermediates = input.intermediates === undefined
    ? undefined
    : Object.freeze(Object.fromEntries(
        Object.entries(input.intermediates).map(([name, coefficients]) => [
          name,
          freezeCoefficients(coefficients),
        ]),
      ))
  const modulus = input.modulus === undefined
    ? undefined
    : freezeCoefficients(input.modulus)

  return Object.freeze({
    operation: input.operation,
    operands: Object.freeze(operands),
    ...(intermediates === undefined ? {} : { intermediates }),
    ...(modulus === undefined ? {} : { modulus }),
  })
}

function copyTraceValue(value: TraceValue): TraceValue {
  return typeof value === 'bigint' ? value : freezeCoefficients(value)
}

function freezeCoefficients(coefficients: Coefficients): Coefficients {
  return Object.freeze([...coefficients])
}
