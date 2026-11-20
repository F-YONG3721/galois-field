import { extendedGcd } from './euclidean.js'
import { isIrreducible } from './irreducible.js'
import { Polynomial } from './polynomial.js'
import { polynomialDivmod } from './polynomial-division.js'
import { PrimeField } from './prime-field.js'
import { FieldElement } from './field-element.js'
import { InvalidModulusError, IncompatibleFieldError } from './types.js'

/** The quotient field GF(p)[x]/(modulus). */
export class ExtensionField {
  public readonly base: PrimeField
  public readonly modulus: Polynomial
  public readonly degree: number
  public readonly order: bigint

  constructor(base: PrimeField, modulus: Polynomial) {
    if (!(base instanceof PrimeField)) {
      throw new TypeError('ExtensionField requires a PrimeField')
    }
    if (!(modulus instanceof Polynomial)) {
      throw new InvalidModulusError('ExtensionField requires a Polynomial modulus')
    }
    if (modulus.field.p !== base.p) {
      throw new IncompatibleFieldError(
        `Modulus characteristic ${modulus.field.p} does not match ${base.p}`,
      )
    }
    if (modulus.degree < 1 || modulus.coefficients[modulus.degree] !== 1n) {
      throw new InvalidModulusError('Extension modulus must be monic of degree at least one')
    }
    if (!isIrreducible(modulus)) {
      throw new InvalidModulusError('Extension modulus must be irreducible')
    }

    this.base = base
    this.modulus = modulus
    this.degree = modulus.degree
    this.order = base.p ** BigInt(this.degree)
  }

  element(coefficients: readonly bigint[]): FieldElement {
    if (!Array.isArray(coefficients)) {
      throw new TypeError('Field element coefficients must be an array')
    }
    return new FieldElement(this, this.reduce(new Polynomial(this.base, coefficients)).coefficients)
  }

  zero(): FieldElement {
    return this.element([0n])
  }

  one(): FieldElement {
    return this.element([1n])
  }

  /** Reduce a base polynomial to its canonical representative modulo the modulus. */
  reduce(polynomial: Polynomial): Polynomial {
    if (!(polynomial instanceof Polynomial)) {
      throw new TypeError('Extension reduction requires a Polynomial')
    }
    if (polynomial.field.p !== this.base.p) {
      throw new IncompatibleFieldError(
        `Polynomial characteristic ${polynomial.field.p} does not match ${this.base.p}`,
      )
    }
    return polynomialDivmod(polynomial, this.modulus).remainder
  }

  /** Return the monic polynomial identity used for construction comparisons. */
  isSameConstruction(other: ExtensionField): boolean {
    return other instanceof ExtensionField
      && this.base.p === other.base.p
      && this.modulus.equals(other.modulus)
  }

  /** Polynomial inverse modulo this field's defining modulus. */
  inverse(polynomial: Polynomial): Polynomial {
    const reduced = this.reduce(polynomial)
    const result = extendedGcd(reduced, this.modulus)
    return this.reduce(result.s)
  }
}
