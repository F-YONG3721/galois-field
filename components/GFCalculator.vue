<script setup lang="ts">
import { ref } from 'vue'
import {
  ExtensionField,
  Polynomial,
  PrimeField,
  TraceRecorder,
} from '../lib/galois/index.ts'
import type { FieldElement } from '../lib/galois/field-element.ts'
import type { TraceStep } from '../lib/galois/types.ts'

type OperandKey = 'zero' | 'one' | 'alpha' | 'alphaPlusOne'

interface OperandOption {
  key: OperandKey
  label: string
  coefficients: readonly bigint[]
}

interface CalculationResult {
  leftLabel: string
  rightLabel: string
  value: FieldElement
  steps: readonly TraceStep[]
}

const operands: readonly OperandOption[] = [
  { key: 'zero', label: '0', coefficients: [0n, 0n] },
  { key: 'one', label: '1', coefficients: [1n, 0n] },
  { key: 'alpha', label: 'α', coefficients: [0n, 1n] },
  { key: 'alphaPlusOne', label: 'α + 1', coefficients: [1n, 1n] },
]

const base = new PrimeField(2n)
const modulus = new Polynomial(base, [1n, 1n, 1n])
const field = new ExtensionField(base, modulus)

const leftKey = ref<OperandKey>('alpha')
const rightKey = ref<OperandKey>('alphaPlusOne')
const calculation = ref<CalculationResult | null>(null)
const error = ref<string | null>(null)

function optionFor(key: OperandKey): OperandOption {
  return operands.find((operand) => operand.key === key) ?? operands[0]
}

function clearCalculation(): void {
  calculation.value = null
  error.value = null
}

function calculate(): void {
  const left = optionFor(leftKey.value)
  const right = optionFor(rightKey.value)
  const recorder = new TraceRecorder()

  try {
    const leftElement = field.element(left.coefficients)
    const rightElement = field.element(right.coefficients)
    const value = leftElement.mul(rightElement, { trace: recorder.asSink() })
    calculation.value = {
      leftLabel: left.label,
      rightLabel: right.label,
      value,
      steps: recorder.steps,
    }
    error.value = null
  } catch (caught) {
    calculation.value = null
    error.value = caught instanceof Error ? caught.message : 'Unable to calculate this product.'
  }
}

function formatElement(element: FieldElement): string {
  const coefficients = element.coefficients
  if (coefficients.every((coefficient) => coefficient === 0n)) return '0'
  if (coefficients[1] === 1n && coefficients[0] === 1n) return 'α + 1'
  if (coefficients[1] === 1n) return 'α'
  return '1'
}

function expressionOperand(label: string): string {
  return label.includes(' + ') ? `(${label})` : label
}
</script>

<template>
  <div class="gf-calculator" data-testid="gf-calculator">
    <div class="calculator-intro">
      <div>
        <span class="eyebrow">Interactive arithmetic</span>
        <h2>Multiply in GF(2²)</h2>
        <p>Choose two field elements and let the completed arithmetic core reduce the product.</p>
      </div>
      <div class="formula-card" aria-label="Field definition">
        <span>Field definition</span>
        <strong>GF(2)[x] / (x² + x + 1)</strong>
        <small>α² = α + 1</small>
      </div>
    </div>

    <div class="calculator-controls">
      <label>
        <span>First element</span>
        <select v-model="leftKey" aria-label="First element" @change="clearCalculation">
          <option v-for="operand in operands" :key="operand.key" :value="operand.key">
            {{ operand.label }}
          </option>
        </select>
      </label>

      <span class="operator" aria-hidden="true">×</span>

      <label>
        <span>Second element</span>
        <select v-model="rightKey" aria-label="Second element" @change="clearCalculation">
          <option v-for="operand in operands" :key="operand.key" :value="operand.key">
            {{ operand.label }}
          </option>
        </select>
      </label>

      <button type="button" class="calculate-button" @click="calculate">Calculate</button>
    </div>

    <p v-if="error" class="error-message" role="alert">{{ error }}</p>

    <div v-if="calculation" class="calculator-output" data-testid="calculation-result" aria-live="polite">
      <div class="result-card">
        <span class="eyebrow">Result</span>
        <div class="result-equation">
          {{ expressionOperand(calculation.leftLabel) }} × {{ expressionOperand(calculation.rightLabel) }} =
          <strong>{{ formatElement(calculation.value) }}</strong>
        </div>
      </div>

      <GFOperationSteps
        :left-label="calculation.leftLabel"
        :right-label="calculation.rightLabel"
        :result-label="formatElement(calculation.value)"
        :steps="calculation.steps"
      />
    </div>

    <p v-else class="output-placeholder">Your result and the operation trace will appear here.</p>
  </div>
</template>

<style scoped>
.gf-calculator {
  width: min(100%, 58rem);
  margin: 0 auto;
  color: #f8fafc;
}

.calculator-intro {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1.5rem;
}

.eyebrow {
  color: #93c5fd;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h2 {
  margin: 0.25rem 0 0.35rem;
  font-size: clamp(1.45rem, 3vw, 2.1rem);
}

.calculator-intro p {
  max-width: 34rem;
  margin: 0;
  color: #cbd5e1;
  font-size: 0.92rem;
}

.formula-card {
  flex: 0 0 auto;
  min-width: 14rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid rgba(96, 165, 250, 0.35);
  border-radius: 0.75rem;
  background: rgba(30, 64, 175, 0.2);
}

.formula-card span,
.formula-card small {
  display: block;
  color: #bfdbfe;
  font-size: 0.72rem;
}

.formula-card strong {
  display: block;
  margin: 0.18rem 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.86rem;
}

.calculator-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
  align-items: end;
  gap: 0.75rem;
  margin: 1.2rem 0 0.85rem;
}

label span {
  display: block;
  margin-bottom: 0.35rem;
  color: #cbd5e1;
  font-size: 0.78rem;
}

select,
.calculate-button {
  min-height: 2.65rem;
  border-radius: 0.55rem;
  font: inherit;
}

select {
  width: 100%;
  padding: 0 0.7rem;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: #0f172a;
  color: #f8fafc;
}

.operator {
  padding-bottom: 0.45rem;
  color: #93c5fd;
  font-size: 1.45rem;
  font-weight: 700;
}

.calculate-button {
  padding: 0 1.05rem;
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

.calculator-output {
  display: grid;
  gap: 0.75rem;
}

.result-card {
  padding: 0.85rem 1.15rem;
  border: 1px solid rgba(96, 165, 250, 0.42);
  border-radius: 0.9rem;
  background: linear-gradient(105deg, rgba(30, 64, 175, 0.4), rgba(15, 23, 42, 0.78));
}

.result-equation {
  margin-top: 0.25rem;
  color: #e0f2fe;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: clamp(1.15rem, 2.8vw, 1.7rem);
}

.result-equation strong {
  color: #facc15;
}

.output-placeholder,
.error-message {
  margin: 0.75rem 0 0;
  color: #94a3b8;
  font-size: 0.82rem;
  text-align: center;
}

.error-message {
  color: #fca5a5;
}

@media (max-width: 640px) {
  .calculator-intro {
    display: block;
  }

  .formula-card {
    margin-top: 0.8rem;
  }

  .calculator-controls {
    grid-template-columns: 1fr 1fr;
  }

  .operator {
    display: none;
  }

  .calculate-button {
    grid-column: 1 / -1;
  }
}
</style>
