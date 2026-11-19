<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ExtensionField,
  Polynomial,
  PrimeField,
  TraceRecorder,
} from '../lib/galois/index.ts'
import type { FieldElement } from '../lib/galois/field-element.ts'
import type { TraceStep } from '../lib/galois/types.ts'

type OperationKey = 'add' | 'sub' | 'mul' | 'div'
type PresetKey = 'gf4' | 'gf7' | 'gf8' | 'gf9' | 'custom'
type ErrorTarget = 'p' | 'n' | 'modulus' | 'left' | 'right' | 'operation'

interface Preset {
  label: string
  p: string
  n: string
  modulus: string
  left: string
  right: string
  operation: OperationKey
}

interface ValidationErrors {
  p: string
  n: string
  modulus: string
  left: string
  right: string
  operation: string
}

interface FieldContext {
  prime: PrimeField
  degree: number
  extension?: ExtensionField
  modulus?: Polynomial
  fieldLabel: string
  modulusLabel: string
  relationLabel: string
}

interface CalculationResult {
  fieldLabel: string
  modulusLabel: string
  relationLabel: string
  leftLabel: string
  rightLabel: string
  resultLabel: string
  operation: OperationKey
  steps: readonly TraceStep[]
}

const presets: Record<Exclude<PresetKey, 'custom'>, Preset> = {
  gf4: {
    label: 'GF(4): x² + x + 1',
    p: '2',
    n: '2',
    modulus: '1, 1, 1',
    left: '0, 1',
    right: '1, 1',
    operation: 'mul',
  },
  gf7: {
    label: 'GF(7): prime field',
    p: '7',
    n: '1',
    modulus: '',
    left: '3',
    right: '2',
    operation: 'div',
  },
  gf8: {
    label: 'GF(8): x³ + x + 1',
    p: '2',
    n: '3',
    modulus: '1, 1, 0, 1',
    left: '0, 0, 1',
    right: '0, 1, 0',
    operation: 'mul',
  },
  gf9: {
    label: 'GF(9): x² + 1',
    p: '3',
    n: '2',
    modulus: '1, 0, 1',
    left: '0, 1',
    right: '0, 1',
    operation: 'mul',
  },
}

const presetKey = ref<PresetKey>('gf4')
const pInput = ref(presets.gf4.p)
const nInput = ref(presets.gf4.n)
const modulusInput = ref(presets.gf4.modulus)
const leftInput = ref(presets.gf4.left)
const rightInput = ref(presets.gf4.right)
const operation = ref<OperationKey>(presets.gf4.operation)
const calculation = ref<CalculationResult | null>(null)
const errors = ref<ValidationErrors>(emptyErrors())

const showModulus = computed(() => nInput.value.trim() !== '1')

function emptyErrors(): ValidationErrors {
  return { p: '', n: '', modulus: '', left: '', right: '', operation: '' }
}

function errorFor(target: ErrorTarget, message: string): Error & { target: ErrorTarget } {
  const error = new Error(message) as Error & { target: ErrorTarget }
  error.target = target
  return error
}

function clearCalculation(): void {
  calculation.value = null
  errors.value = emptyErrors()
}

function applyPreset(next: PresetKey): void {
  presetKey.value = next
  if (next === 'custom') {
    clearCalculation()
    return
  }

  const preset = presets[next]
  pInput.value = preset.p
  nInput.value = preset.n
  modulusInput.value = preset.modulus
  leftInput.value = preset.left
  rightInput.value = preset.right
  operation.value = preset.operation
  clearCalculation()
}

function markCustom(): void {
  presetKey.value = 'custom'
  clearCalculation()
}

function onFieldChange(): void {
  markCustom()
  syncOperandsToDegree()
}

function syncOperandsToDegree(): void {
  const degree = Number(nInput.value.trim())
  if (!Number.isSafeInteger(degree) || degree < 1 || degree > 128) return

  const left = Array<string>(degree).fill('0')
  const right = Array<string>(degree).fill('0')
  if (degree > 1) {
    left[1] = '1'
    right[0] = '1'
    right[1] = '1'
  } else {
    right[0] = '1'
  }
  leftInput.value = left.join(', ')
  rightInput.value = right.join(', ')
}

function parseBigint(raw: string, target: ErrorTarget, label: string): bigint {
  if (!/^[+-]?\d+$/.test(raw.trim())) {
    throw errorFor(target, `${label} must be an integer.`)
  }
  try {
    return BigInt(raw.trim())
  } catch {
    throw errorFor(target, `${label} must be an integer.`)
  }
}

function parseDegree(): number {
  const value = parseBigint(nInput.value, 'n', 'Degree n')
  if (value < 1n) throw errorFor('n', 'Degree n must be a positive integer.')
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw errorFor('n', 'Degree n is too large for this UI.')
  return Number(value)
}

function parseVector(raw: string, target: ErrorTarget, label: string): bigint[] {
  const parts = raw.split(',').map((part) => part.trim())
  if (parts.length === 0 || parts.some((part) => part === '')) {
    throw errorFor(target, `${label} must be comma-separated integers.`)
  }
  return parts.map((part) => parseBigint(part, target, label))
}

function formatPolynomial(values: readonly bigint[], variable = 'α'): string {
  if (values.length === 0 || values.every((value) => value === 0n)) return '0'

  const terms: string[] = []
  for (let exponent = values.length - 1; exponent >= 0; exponent -= 1) {
    const coefficient = values[exponent]
    if (coefficient === undefined || coefficient === 0n) continue

    const termVariable = exponent === 0 ? '' : exponent === 1 ? variable : `${variable}${superscript(exponent)}`
    const coefficientText = coefficient === 1n && termVariable !== '' ? '' : coefficient.toString()
    terms.push(`${coefficientText}${termVariable}`)
  }
  return terms.join(' + ')
}

function superscript(value: number): string {
  return String(value).replace(/[0-9]/g, (digit) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)] ?? digit)
}

function relationFor(modulus: Polynomial, prime: PrimeField): string {
  const coefficients = modulus.coefficients.slice(0, -1).map((coefficient) => prime.neg(coefficient))
  return `α${superscript(modulus.degree)} = ${formatPolynomial(coefficients)}`
}

function buildField(): FieldContext {
  const p = parseBigint(pInput.value, 'p', 'Prime p')
  const degree = parseDegree()
  const prime = new PrimeField(p)

  if (degree === 1) {
    return {
      prime,
      degree,
      fieldLabel: `GF(${p})`,
      modulusLabel: 'not required',
      relationLabel: '',
    }
  }

  const modulusCoefficients = parseVector(modulusInput.value, 'modulus', 'Modulus')
  if (modulusCoefficients.length !== degree + 1) {
    throw errorFor('modulus', `Modulus must have exactly ${degree + 1} coefficients (constant term first).`)
  }

  const modulus = new Polynomial(prime, modulusCoefficients)
  if (modulus.degree !== degree) {
    throw errorFor('modulus', `Modulus must have degree exactly ${degree}.`)
  }

  let extension: ExtensionField
  try {
    extension = new ExtensionField(prime, modulus)
  } catch (caught) {
    throw errorFor('modulus', errorMessage(caught))
  }
  return {
    prime,
    degree,
    extension,
    modulus,
    fieldLabel: `GF(${p}^${degree})`,
    modulusLabel: formatPolynomial(modulus.coefficients, 'x'),
    relationLabel: relationFor(modulus, prime),
  }
}

function formatFieldElement(value: FieldElement): string {
  return formatPolynomial(value.coefficients)
}

function runExtensionOperation(
  context: FieldContext,
  leftCoefficients: readonly bigint[],
  rightCoefficients: readonly bigint[],
): { resultLabel: string; steps: readonly TraceStep[] } {
  const recorder = new TraceRecorder()
  const left = context.extension!.element(leftCoefficients)
  const right = context.extension!.element(rightCoefficients)
  let result: FieldElement

  switch (operation.value) {
    case 'add':
      result = left.add(right, { trace: recorder.asSink() })
      break
    case 'sub':
      result = left.sub(right, { trace: recorder.asSink() })
      break
    case 'mul':
      result = left.mul(right, { trace: recorder.asSink() })
      break
    case 'div':
      result = left.div(right, { trace: recorder.asSink() })
      break
  }

  return { resultLabel: formatFieldElement(result), steps: recorder.steps }
}

function runPrimeOperation(
  context: FieldContext,
  leftCoefficients: readonly bigint[],
  rightCoefficients: readonly bigint[],
): { resultLabel: string; steps: readonly TraceStep[] } {
  if (leftCoefficients.length !== 1) {
    throw errorFor('left', 'Prime-field operands require one coefficient.')
  }
  if (rightCoefficients.length !== 1) {
    throw errorFor('right', 'Prime-field operands require one coefficient.')
  }

  const left = context.prime.normalize(leftCoefficients[0])
  const right = context.prime.normalize(rightCoefficients[0])
  let result: bigint

  switch (operation.value) {
    case 'add':
      result = context.prime.add(left, right)
      break
    case 'sub':
      result = context.prime.sub(left, right)
      break
    case 'mul':
      result = context.prime.mul(left, right)
      break
    case 'div':
      result = context.prime.div(left, right)
      break
  }

  return { resultLabel: result.toString(), steps: [] }
}

function calculate(): void {
  clearCalculation()

  let context: FieldContext
  try {
    context = buildField()
  } catch (caught) {
    const target = isTargetedError(caught) ? caught.target : 'p'
    setError(target, errorMessage(caught))
    return
  }

  let leftCoefficients: bigint[]
  let rightCoefficients: bigint[]
  try {
    leftCoefficients = parseVector(leftInput.value, 'left', 'Left coefficients')
    rightCoefficients = parseVector(rightInput.value, 'right', 'Right coefficients')
  } catch (caught) {
    const target = isTargetedError(caught) ? caught.target : 'left'
    setError(target, errorMessage(caught))
    return
  }

  try {
    const operationResult = context.degree === 1
      ? runPrimeOperation(context, leftCoefficients, rightCoefficients)
      : runExtensionOperation(context, leftCoefficients, rightCoefficients)
    calculation.value = {
      fieldLabel: context.fieldLabel,
      modulusLabel: context.modulusLabel,
      relationLabel: context.relationLabel,
      leftLabel: formatPolynomial(leftCoefficients.map((value) => context.prime.normalize(value))),
      rightLabel: formatPolynomial(rightCoefficients.map((value) => context.prime.normalize(value))),
      resultLabel: operationResult.resultLabel,
      operation: operation.value,
      steps: operationResult.steps,
    }
  } catch (caught) {
    const target = isTargetedError(caught) ? caught.target : 'operation'
    setError(target, errorMessage(caught))
  }
}

function isTargetedError(value: unknown): value is Error & { target: ErrorTarget } {
  return value instanceof Error && 'target' in value
}

function errorMessage(value: unknown): string {
  return value instanceof Error ? value.message : 'Unable to calculate with these parameters.'
}

function setError(target: ErrorTarget, message: string): void {
  errors.value = { ...emptyErrors(), [target]: message }
}
</script>

<template>
  <div class="gf-calculator" data-testid="gf-calculator">
    <div class="calculator-intro">
      <div>
        <span class="eyebrow">Interactive arithmetic</span>
        <h2>General Galois Field calculator</h2>
        <p>Configure GF(pⁿ), enter coefficient vectors, and reuse the arithmetic core for all four operations.</p>
      </div>
      <div class="formula-card" aria-label="Coefficient convention">
        <span>Coefficient order</span>
        <strong>[a₀, a₁, …] = a₀ + a₁α + …</strong>
        <small>GF(4) remains the default example.</small>
      </div>
    </div>

    <div class="preset-row">
      <label class="preset-label" for="gf-preset">Example field</label>
      <select id="gf-preset" v-model="presetKey" data-testid="preset" @change="applyPreset(presetKey)">
        <option v-for="(preset, key) in presets" :key="key" :value="key">{{ preset.label }}</option>
        <option value="custom">Custom parameters</option>
      </select>
    </div>

    <div class="field-controls">
      <label>
        <span>Prime p</span>
        <input v-model="pInput" data-testid="prime-input" inputmode="numeric" aria-label="Prime p" @change="onFieldChange">
        <small v-if="errors.p" class="input-error">{{ errors.p }}</small>
      </label>
      <label>
        <span>Degree n</span>
        <input v-model="nInput" data-testid="degree-input" inputmode="numeric" aria-label="Degree n" @change="onFieldChange">
        <small v-if="errors.n" class="input-error">{{ errors.n }}</small>
      </label>
      <label v-if="showModulus" class="modulus-input">
        <span>Modulus coefficients</span>
        <input v-model="modulusInput" data-testid="modulus-input" aria-label="Modulus coefficients" @input="markCustom">
        <small class="input-help">monic, degree n, constant term first</small>
        <small v-if="errors.modulus" class="input-error">{{ errors.modulus }}</small>
      </label>
      <div v-else class="prime-note">n = 1 uses the prime-field API; no modulus is required.</div>
    </div>

    <div class="operand-controls">
      <label>
        <span>Left coefficients</span>
        <input v-model="leftInput" data-testid="left-input" aria-label="Left coefficients" @input="markCustom">
        <small class="input-help">comma-separated integers</small>
        <small v-if="errors.left" class="input-error">{{ errors.left }}</small>
      </label>

      <label class="operation-input">
        <span>Operation</span>
        <select v-model="operation" data-testid="operation-select" aria-label="Operation" @change="markCustom">
          <option value="add">Add (+)</option>
          <option value="sub">Subtract (−)</option>
          <option value="mul">Multiply (×)</option>
          <option value="div">Divide (÷)</option>
        </select>
        <small v-if="errors.operation" class="input-error">{{ errors.operation }}</small>
      </label>

      <label>
        <span>Right coefficients</span>
        <input v-model="rightInput" data-testid="right-input" aria-label="Right coefficients" @input="markCustom">
        <small class="input-help">constant term first</small>
        <small v-if="errors.right" class="input-error">{{ errors.right }}</small>
      </label>

      <button type="button" class="calculate-button" data-testid="calculate" @click="calculate">Calculate</button>
    </div>

    <p class="limit-note">Inputs are coefficient vectors, so the UI does not enumerate all pⁿ elements. Large fields may take longer to validate.</p>

    <div v-if="calculation" class="calculator-output" data-testid="calculation-result" aria-live="polite">
      <div class="result-card">
        <span class="eyebrow">Result · {{ calculation.fieldLabel }}</span>
        <div class="result-equation">
          {{ calculation.leftLabel }}
          {{ calculation.operation === 'add' ? '+' : calculation.operation === 'sub' ? '−' : calculation.operation === 'mul' ? '×' : '÷' }}
          {{ calculation.rightLabel }} = <strong>{{ calculation.resultLabel }}</strong>
        </div>
      </div>

      <GFOperationSteps
        :operation="calculation.operation"
        :left-label="calculation.leftLabel"
        :right-label="calculation.rightLabel"
        :result-label="calculation.resultLabel"
        :field-label="calculation.fieldLabel"
        :modulus-label="calculation.modulusLabel"
        :relation-label="calculation.relationLabel"
        :steps="calculation.steps"
      />
    </div>

    <p v-else class="output-placeholder">Your result and the selected field's computation steps will appear here.</p>
  </div>
</template>

<style scoped>
.gf-calculator {
  width: min(100%, 64rem);
  margin: 0 auto;
  color: #f8fafc;
}

.calculator-intro {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1.3rem;
}

.eyebrow {
  color: #93c5fd;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h2 {
  margin: 0.2rem 0 0.25rem;
  font-size: clamp(1.3rem, 2.7vw, 1.9rem);
}

.calculator-intro p {
  max-width: 38rem;
  margin: 0;
  color: #cbd5e1;
  font-size: 0.82rem;
}

.formula-card {
  flex: 0 0 auto;
  min-width: 16rem;
  padding: 0.62rem 0.8rem;
  border: 1px solid rgba(96, 165, 250, 0.35);
  border-radius: 0.7rem;
  background: rgba(30, 64, 175, 0.2);
}

.formula-card span,
.formula-card small {
  display: block;
  color: #bfdbfe;
  font-size: 0.67rem;
}

.formula-card strong {
  display: block;
  margin: 0.13rem 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.76rem;
}

.preset-row,
.field-controls,
.operand-controls {
  display: grid;
  align-items: end;
  gap: 0.55rem;
  margin-top: 0.68rem;
}

.preset-row {
  grid-template-columns: auto minmax(0, 25rem);
}

.field-controls {
  grid-template-columns: minmax(5rem, 0.7fr) minmax(5rem, 0.7fr) minmax(0, 2.6fr);
}

.operand-controls {
  grid-template-columns: minmax(0, 2fr) minmax(7rem, 1fr) minmax(0, 2fr) auto;
}

label span,
.preset-label {
  display: block;
  margin-bottom: 0.25rem;
  color: #cbd5e1;
  font-size: 0.7rem;
}

input,
select,
.calculate-button {
  width: 100%;
  min-height: 2.25rem;
  border-radius: 0.48rem;
  font: inherit;
}

input,
select {
  padding: 0 0.6rem;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: #0f172a;
  color: #f8fafc;
}

input:focus,
select:focus,
.calculate-button:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}

.preset-label {
  margin-bottom: 0.55rem;
}

.input-help,
.prime-note,
.limit-note,
.output-placeholder {
  color: #94a3b8;
  font-size: 0.66rem;
}

.input-help {
  display: block;
  margin-top: 0.2rem;
}

.input-error {
  display: block;
  margin-top: 0.2rem;
  color: #fca5a5;
  font-size: 0.66rem;
}

.prime-note {
  align-self: center;
  padding: 0.55rem 0;
}

.calculate-button {
  width: auto;
  min-width: 7rem;
  padding: 0 0.9rem;
  border: 0;
  background: #2563eb;
  color: white;
  cursor: pointer;
  font-weight: 700;
  transition: background 150ms ease, transform 150ms ease;
}

.calculate-button:hover {
  background: #3b82f6;
  transform: translateY(-1px);
}

.limit-note {
  margin: 0.42rem 0 0;
}

.calculator-output {
  display: grid;
  gap: 0.6rem;
  margin-top: 0.65rem;
}

.result-card {
  padding: 0.65rem 1.05rem;
  border: 1px solid rgba(96, 165, 250, 0.42);
  border-radius: 0.82rem;
  background: linear-gradient(105deg, rgba(30, 64, 175, 0.4), rgba(15, 23, 42, 0.78));
}

.result-equation {
  margin-top: 0.18rem;
  color: #e0f2fe;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: clamp(1rem, 2.2vw, 1.42rem);
}

.result-equation strong {
  color: #facc15;
}

.output-placeholder {
  margin: 0.65rem 0 0;
  text-align: center;
}

@media (max-width: 760px) {
  .calculator-intro {
    display: block;
  }

  .formula-card {
    margin-top: 0.55rem;
  }

  .field-controls,
  .operand-controls {
    grid-template-columns: 1fr 1fr;
  }

  .modulus-input,
  .prime-note,
  .operand-controls label:first-child,
  .calculate-button {
    grid-column: 1 / -1;
  }

  .calculate-button {
    width: 100%;
  }
}
</style>
