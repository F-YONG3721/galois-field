import { PrimeField } from './prime-field.js'
import { IncompatibleFieldError, InvalidPolynomialError } from './types.js'
import type {
  Coefficients,
  PolynomialDivisionResult,
  TraceOptions,
} from './types.js'
import { polynomialDivmod } from './polynomial-division.js'

/** A polynomial over a prime field, represented constant term first. */
export class Polynomial {
  public readonly field: PrimeField
  public readonly coefficients: Coefficients
  public readonly degree: number

  constructor(field: PrimeField, coefficients: readonly bigint[]) {
    if (!(field instanceof PrimeField)) {
      throw new TypeError('Polynomial requires a PrimeField')
    }
    if (!Array.isArray(coefficients)) {
      throw new InvalidPolynomialError('Polynomial coefficients must be an array')
    }

    const normalized = coefficients.map((coefficient) => {
      if (typeof coefficient !== 'bigint') {
        throw new TypeError('Polynomial coefficients must be bigints')
      }
      return field.normalize(coefficient)
    })

    while (normalized.length > 1 && normalized[normalized.length - 1] === 0n) {
      normalized.pop()
    }
    if (normalized.length === 0) {
      normalized.push(0n)
    }

    this.field = field
    this.coefficients = Object.freeze(normalized.slice())
    this.degree = this.coefficients.length === 1 && this.coefficients[0] === 0n
      ? -1
      : this.coefficients.length - 1
  }

  get isZero(): boolean {
    return this.degree === -1
  }

  add(other: Polynomial, _options?: TraceOptions): Polynomial {
    this.assertCompatible(other)
    const length = Math.max(this.coefficients.length, other.coefficients.length)
    const result: bigint[] = []
    for (let index = 0; index < length; index += 1) {
      result.push(this.field.add(this.coefficientAt(index), other.coefficientAt(index)))
    }
    return new Polynomial(this.field, result)
  }

  sub(other: Polynomial, _options?: TraceOptions): Polynomial {
    this.assertCompatible(other)
    const length = Math.max(this.coefficients.length, other.coefficients.length)
    const result: bigint[] = []
    for (let index = 0; index < length; index += 1) {
      result.push(this.field.sub(this.coefficientAt(index), other.coefficientAt(index)))
    }
    return new Polynomial(this.field, result)
  }

  neg(_options?: TraceOptions): Polynomial {
    return new Polynomial(this.field, this.coefficients.map((coefficient) => this.field.neg(coefficient)))
  }

  mul(other: Polynomial, _options?: TraceOptions): Polynomial {
    this.assertCompatible(other)
    if (this.isZero || other.isZero) {
      return new Polynomial(this.field, [0n])
    }

    const result = Array<bigint>(this.degree + other.degree + 1).fill(0n)
    for (let left = 0; left <= this.degree; left += 1) {
      for (let right = 0; right <= other.degree; right += 1) {
        result[left + right] = this.field.add(
          result[left + right],
          this.field.mul(this.coefficients[left], other.coefficients[right]),
        )
      }
    }
    return new Polynomial(this.field, result)
  }

  equals(other: Polynomial): boolean {
    if (!(other instanceof Polynomial) || this.field.p !== other.field.p) {
      return false
    }
    if (this.coefficients.length !== other.coefficients.length) {
      return false
    }
    return this.coefficients.every((coefficient, index) => coefficient === other.coefficients[index])
  }

  divmod(divisor: Polynomial, options?: TraceOptions): PolynomialDivisionResult<Polynomial> {
    return polynomialDivmod(this, divisor, options)
  }

  private coefficientAt(index: number): bigint {
    return index < this.coefficients.length ? this.coefficients[index] : 0n
  }

  private assertCompatible(other: Polynomial): void {
    if (!(other instanceof Polynomial)) {
      throw new TypeError('Polynomial operation requires another Polynomial')
    }
    if (this.field.p !== other.field.p) {
      throw new IncompatibleFieldError(
        `Polynomials must have the same base characteristic (${this.field.p} and ${other.field.p})`,
      )
    }
  }
}
