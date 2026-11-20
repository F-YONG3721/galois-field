import { Polynomial } from './polynomial.js'
import { IncompatibleFieldError, InvalidPolynomialError } from './types.js'
import type { PolynomialDivisionResult, TraceOptions } from './types.js'

/** Euclidean quotient and remainder in GF(p)[x]. */
export function polynomialDivmod(
  dividend: Polynomial,
  divisor: Polynomial,
  options?: TraceOptions,
): PolynomialDivisionResult<Polynomial> {
  if (!(dividend instanceof Polynomial) || !(divisor instanceof Polynomial)) {
    throw new TypeError('polynomialDivmod requires Polynomial operands')
  }
  if (dividend.field.p !== divisor.field.p) {
    throw new IncompatibleFieldError(
      `Polynomials must have the same base characteristic (${dividend.field.p} and ${divisor.field.p})`,
    )
  }
  if (divisor.isZero) {
    throw new InvalidPolynomialError('Polynomial division by zero')
  }

  const field = dividend.field
  const quotient = Array<bigint>(
    Math.max(0, dividend.degree - divisor.degree + 1),
  ).fill(0n)
  const remainder = dividend.coefficients.slice()
  const divisorDegree = divisor.degree
  const divisorLeading = divisor.coefficients[divisorDegree]
  const divisorLeadingInverse = field.inv(divisorLeading)

  while (!(remainder.length === 1 && remainder[0] === 0n) && remainder.length - 1 >= divisorDegree) {
    const remainderDegree = remainder.length - 1
    const shift = remainderDegree - divisorDegree
    const factor = field.mul(remainder[remainderDegree], divisorLeadingInverse)
    quotient[shift] = field.add(quotient[shift] ?? 0n, factor)

    for (let index = 0; index <= divisorDegree; index += 1) {
      const position = index + shift
      remainder[position] = field.sub(
        remainder[position] ?? 0n,
        field.mul(factor, divisor.coefficients[index]),
      )
    }
    while (remainder.length > 1 && remainder[remainder.length - 1] === 0n) {
      remainder.pop()
    }
  }

  const result = {
    quotient: new Polynomial(field, quotient),
    remainder: new Polynomial(field, remainder),
  }
  options?.trace?.({
    operation: 'polynomial-divmod',
    operands: [dividend.coefficients.slice(), divisor.coefficients.slice()],
    intermediates: {
      quotient: result.quotient.coefficients.slice(),
      remainder: result.remainder.coefficients.slice(),
    },
  })
  return result
}
