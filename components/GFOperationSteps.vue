<script setup lang="ts">
import { computed } from 'vue'
import type { TraceStep } from '../lib/galois/types.ts'

type OperationKey = 'add' | 'sub' | 'mul' | 'div'

const props = defineProps<{
  operation: OperationKey
  leftLabel: string
  rightLabel: string
  resultLabel: string
  fieldLabel: string
  modulusLabel: string
  relationLabel: string
  steps: readonly TraceStep[]
}>()

const operationSymbols: Record<OperationKey, string> = {
  add: '+',
  sub: '−',
  mul: '×',
  div: '÷',
}

const operationNames: Record<OperationKey, string> = {
  add: 'Add',
  sub: 'Subtract',
  mul: 'Multiply',
  div: 'Divide',
}

const fieldSteps = computed(() => props.steps.filter((step) => step.operation.startsWith('field-')))

function expressionOperand(label: string): string {
  return label.includes(' + ') || label.includes(' − ') ? `(${label})` : label
}

function coefficients(step: TraceStep, name: string): readonly bigint[] {
  return step.intermediates?.[name] ?? []
}

function formatPolynomial(values: readonly bigint[]): string {
  if (values.length === 0 || values.every((value) => value === 0n)) return '0'

  const terms: string[] = []
  for (let exponent = values.length - 1; exponent >= 0; exponent -= 1) {
    const coefficient = values[exponent]
    if (coefficient === undefined || coefficient === 0n) continue

    const variable = exponent === 0 ? '' : exponent === 1 ? 'α' : `α${superscript(exponent)}`
    const coefficientText = coefficient === 1n && variable !== '' ? '' : coefficient.toString()
    terms.push(`${coefficientText}${variable}`)
  }
  return terms.join(' + ')
}

function superscript(value: number): string {
  return String(value).replace(/[0-9]/g, (digit) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)] ?? digit)
}
</script>

<template>
  <section class="operation-steps" aria-label="Operation derivation">
    <div class="steps-heading">
      <span class="eyebrow">Derivation</span>
      <span class="modulus">
        {{ props.fieldLabel }} ·
        <template v-if="props.modulusLabel === 'not required'">prime-field API</template>
        <template v-else>m(x) = {{ props.modulusLabel }}</template>
      </span>
    </div>

    <div class="result-line">
      {{ expressionOperand(props.leftLabel) }} {{ operationSymbols[props.operation] }}
      {{ expressionOperand(props.rightLabel) }} = <strong>{{ props.resultLabel }}</strong>
    </div>

    <div v-if="props.relationLabel" class="relation">Using {{ props.relationLabel }}</div>

    <div v-if="fieldSteps.length > 0" class="steps-list">
      <template v-for="(step, index) in fieldSteps" :key="`${step.operation}-${index}`">
        <div v-if="step.operation === 'field-mul'" class="step">
          <span class="step-number">{{ index + 1 }}</span>
          <div>
            <strong>Expand and reduce</strong>
            <span class="math-line">
              {{ formatPolynomial(coefficients(step, 'rawProduct')) }}
              → remainder {{ formatPolynomial(coefficients(step, 'remainder')) }}
            </span>
            <span class="trace-note">
              quotient {{ formatPolynomial(coefficients(step, 'quotient')) }} modulo {{ props.modulusLabel }}
            </span>
          </div>
        </div>

        <div v-else-if="step.operation === 'field-add' || step.operation === 'field-sub'" class="step">
          <span class="step-number">{{ index + 1 }}</span>
          <div>
            <strong>{{ step.operation === 'field-add' ? 'Add coefficients' : 'Subtract coefficients' }}</strong>
            <span class="math-line">→ {{ formatPolynomial(coefficients(step, 'result')) }}</span>
          </div>
        </div>

        <div v-else-if="step.operation === 'field-inv'" class="step">
          <span class="step-number">{{ index + 1 }}</span>
          <div>
            <strong>Invert the divisor</strong>
            <span class="math-line">→ {{ formatPolynomial(coefficients(step, 'result')) }}</span>
          </div>
        </div>
      </template>
    </div>

    <p v-else class="empty-steps">
      {{ props.operation === 'div' && props.fieldLabel.match(/^GF\(\d+\)$/)
        ? 'Prime-field arithmetic uses residues modulo p; no polynomial trace is needed.'
        : `The ${operationNames[props.operation].toLowerCase()} result comes directly from the core.` }}
    </p>
  </section>
</template>

<style scoped>
.operation-steps {
  min-height: 8.7rem;
  padding: 0.9rem 1.1rem;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 0.9rem;
  background: rgba(15, 23, 42, 0.58);
  text-align: left;
}

.steps-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.45rem;
}

.eyebrow {
  color: #93c5fd;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.modulus,
.trace-note,
.empty-steps,
.relation {
  color: #cbd5e1;
  font-size: 0.76rem;
}

.result-line {
  color: #e0f2fe;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1.08rem;
}

.result-line strong {
  color: #facc15;
}

.relation {
  margin-top: 0.22rem;
  color: #bfdbfe;
}

.steps-list {
  display: grid;
  gap: 0.55rem;
  margin-top: 0.58rem;
}

.step {
  display: grid;
  grid-template-columns: 1.5rem 1fr;
  align-items: start;
  gap: 0.55rem;
}

.step-number {
  display: grid;
  width: 1.3rem;
  height: 1.3rem;
  place-items: center;
  border-radius: 999px;
  background: #2563eb;
  color: white;
  font-size: 0.72rem;
  font-weight: 700;
}

.step strong {
  display: block;
  color: #e0f2fe;
  font-size: 0.8rem;
}

.math-line {
  display: block;
  margin-top: 0.12rem;
  color: #f8fafc;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.86rem;
}

.trace-note {
  display: block;
  margin-top: 0.12rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.empty-steps {
  margin: 0.6rem 0 0;
}
</style>
