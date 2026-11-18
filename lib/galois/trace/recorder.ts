import type { TraceSink, TraceStep } from './types.js'
import {
  createTraceStep,
  type TraceStepInput,
} from './types.js'

/**
 * A small in-memory sink useful to callers that need to inspect an operation
 * sequence. Each published step is immutable and the exposed collection is
 * replaced, never mutated, when a new step arrives.
 */
export class TraceRecorder {
  private recordedSteps: readonly TraceStep[] = Object.freeze([])

  get steps(): readonly TraceStep[] {
    return this.recordedSteps
  }

  /** Sink-compatible method for receiving an already-created step. */
  record = (step: TraceStep): void => {
    this.recordedSteps = Object.freeze([
      ...this.recordedSteps,
      createTraceStep(step),
    ])
  }

  /** Alias suitable for code that names sink operations explicitly. */
  emit = this.record

  clear(): void {
    this.recordedSteps = Object.freeze([])
  }

  asSink(): TraceSink {
    return this.record
  }
}

/**
 * Emit a step only when a sink exists. In particular, no defensive copies or
 * trace payload objects are created for the disabled path.
 */
export function recordTraceStep(
  sink: TraceSink | undefined,
  input: TraceStepInput,
): void {
  if (sink === undefined) return
  sink(createTraceStep(input))
}
