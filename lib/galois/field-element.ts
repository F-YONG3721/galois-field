import { polynomialDivmod } from './polynomial-division.js'
import { Polynomial } from './polynomial.js'
import { ExtensionField } from './extension-field.js'
import {
  IncompatibleFieldError,
  InvalidExponentError,
  ZeroDivisionError,
} from './types.js'
import type { TraceOptions } from './types.js'
import { recordTraceStep } from './trace/recorder.js'

/** A canonical element of an ExtensionField. */
export class FieldElement {
  public readonly field: ExtensionField
  public readonly coefficients: readonly bigint[]

  constructor(field: ExtensionField, coefficients: readonly bigint[]) {
    if (!(field instanceof ExtensionField)) {
      throw new TypeError('FieldElement requires an ExtensionField')
    }
    if (!Array.isArray(coefficients)) {
      throw new TypeError('Field element coefficients must be an array')
    }

    const reduced = field.reduce(new Polynomial(field.base, coefficients))
    const canonical = Array<bigint>(field.degree).fill(0n)
    for (let index = 0; index < reduced.coefficients.length; index += 1) {
      canonical[index] = reduced.coefficients[index]
    }
    this.field = field
    this.coefficients = Object.freeze(canonical)
  }

  add(other: FieldElement, options?: TraceOptions): FieldElement {
    this.assertCompatible(other)
    const result = this.field.element(this.polynomial().add(other.polynomial()).coefficients)
    recordTraceStep(options?.trace, {
      operation: 'field-add',
      operands: [this.coefficients, other.coefficients],
      intermediates: { result: result.coefficients },
      modulus: this.field.modulus.coefficients,
    })
    return result
  }

  sub(other: FieldElement, options?: TraceOptions): FieldElement {
    this.assertCompatible(other)
    const result = this.field.element(this.polynomial().sub(other.polynomial()).coefficients)
    recordTraceStep(options?.trace, {
      operation: 'field-sub',
      operands: [this.coefficients, other.coefficients],
      intermediates: { result: result.coefficients },
      modulus: this.field.modulus.coefficients,
    })
    return result
  }

  neg(options?: TraceOptions): FieldElement {
    const result = this.field.element(this.polynomial().neg().coefficients)
    recordTraceStep(options?.trace, {
      operation: 'field-neg',
      operands: [this.coefficients],
      intermediates: { result: result.coefficients },
      modulus: this.field.modulus.coefficients,
    })
    return result
  }

  mul(other: FieldElement, options?: TraceOptions): FieldElement {
    this.assertCompatible(other)
    const rawProduct = this.polynomial().mul(other.polynomial())
    const division = polynomialDivmod(rawProduct, this.field.modulus)
    const result = this.field.element(division.remainder.coefficients)
    recordTraceStep(options?.trace, {
      operation: 'field-mul',
      operands: [this.coefficients, other.coefficients],
      intermediates: {
        rawProduct: rawProduct.coefficients,
        quotient: division.quotient.coefficients,
        remainder: division.remainder.coefficients,
        result: result.coefficients,
      },
      modulus: this.field.modulus.coefficients,
    })
    return result
  }

  inv(options?: TraceOptions): FieldElement {
    if (this.isZero()) {
      throw new ZeroDivisionError('Zero has no multiplicative inverse')
    }
    const inverse = this.field.inverse(this.polynomial())
    const result = this.field.element(inverse.coefficients)
    recordTraceStep(options?.trace, {
      operation: 'field-inv',
      operands: [this.coefficients],
      intermediates: { result: result.coefficients },
      modulus: this.field.modulus.coefficients,
    })
    return result
  }

  div(other: FieldElement, options?: TraceOptions): FieldElement {
    this.assertCompatible(other)
    return this.mul(other.inv(options), options)
  }

  pow(exponent: bigint, options?: TraceOptions): FieldElement {
    if (typeof exponent !== 'bigint') {
      throw new TypeError('Exponent must be a bigint')
    }
    if (exponent < 0n) {
      throw new InvalidExponentError('FieldElement.pow requires a nonnegative exponent')
    }

    let power = exponent
    let factor: FieldElement = this
    let result = this.field.one()
    while (power > 0n) {
      if ((power & 1n) === 1n) {
        result = result.mul(factor, options)
      }
      power >>= 1n
      if (power > 0n) {
        factor = factor.mul(factor, options)
      }
    }
    recordTraceStep(options?.trace, {
      operation: 'field-pow',
      operands: [this.coefficients, exponent],
      intermediates: { result: result.coefficients },
      modulus: this.field.modulus.coefficients,
    })
    return result
  }

  equals(other: FieldElement): boolean {
    return other instanceof FieldElement
      && this.field === other.field
      && this.coefficients.length === other.coefficients.length
      && this.coefficients.every((coefficient, index) => coefficient === other.coefficients[index])
  }

  private polynomial(): Polynomial {
    return new Polynomial(this.field.base, this.coefficients)
  }

  private isZero(): boolean {
    return this.coefficients.every((coefficient) => coefficient === 0n)
  }

  private assertCompatible(other: FieldElement): void {
    if (!(other instanceof FieldElement)) {
      throw new TypeError('Field operation requires another FieldElement')
    }
    if (this.field !== other.field) {
      throw new IncompatibleFieldError('Field elements belong to different ExtensionField constructions')
    }
  }
}
