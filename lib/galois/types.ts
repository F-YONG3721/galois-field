/** A canonical, constant-term-first polynomial coefficient vector. */
export type Coefficients = readonly bigint[]

/** A trace operand may be a scalar or a polynomial coefficient vector. */
export type TraceValue = bigint | Coefficients

/**
 * A machine-readable operation trace record.
 *
 * Implementations must provide defensive copies and must only construct these
 * records when a sink is present.  The shape deliberately contains no UI or
 * serialization concerns.
 */
export interface TraceStep {
  readonly operation: string
  readonly operands: readonly TraceValue[]
  readonly intermediates?: Readonly<Record<string, Coefficients>>
  readonly modulus?: Coefficients
}

/** Receives immutable trace records emitted by arithmetic operations. */
export type TraceSink = (step: TraceStep) => void

/** Optional operation context shared by public arithmetic methods. */
export interface TraceOptions {
  readonly trace?: TraceSink
}

/** Result shape shared by the polynomial division function and method wrapper. */
export interface PolynomialDivisionResult<TPolynomial> {
  readonly quotient: TPolynomial
  readonly remainder: TPolynomial
}

/** Result shape returned by extended Euclid. */
export interface ExtendedGcdResult<TPolynomial> {
  readonly gcd: TPolynomial
  readonly s: TPolynomial
  readonly t: TPolynomial
}

/*
 * P0 edge decisions for implementers:
 * - Empty coefficient input is canonicalized to [0n]; zero has degree -1.
 * - Polynomial division is canonicalized as polynomialDivmod(a, b), with a
 *   matching Polynomial.divmod(b) wrapper; division by zero throws.
 * - gcd(0, 0) and extendedGcd(0, 0) throw InvalidPolynomialError.
 * - isIrreducible throws InvalidPolynomialError for constants and non-monic
 *   inputs; a valid monic reducible polynomial returns false.
 * - Equal characteristics permit polynomial operations; FieldElement values
 *   additionally require the same ExtensionField construction identity.
 * - pow accepts a bigint exponent and rejects negative exponents explicitly.
 * - Public bigint signatures are strict; fixture JSON numbers are converted by
 *   tests and are not accepted as alternate runtime API inputs.
 */

/** Base class for errors intentionally exposed by the Galois-field API. */
export class GaloisError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

/** Thrown when a modulus is not a supported proven prime. */
export class InvalidPrimeError extends GaloisError {}

/** Thrown for division by zero or inversion of zero. */
export class ZeroDivisionError extends GaloisError {}

/** Thrown when an operation receives an unsupported exponent. */
export class InvalidExponentError extends GaloisError {}

/** Thrown for malformed polynomial input or a zero polynomial divisor. */
export class InvalidPolynomialError extends GaloisError {}

/** Thrown when an extension modulus is not monic and irreducible. */
export class InvalidModulusError extends GaloisError {}

/** Thrown when values belong to incompatible field constructions. */
export class IncompatibleFieldError extends GaloisError {}
