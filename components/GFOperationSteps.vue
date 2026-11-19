<script setup lang="ts">
import { computed } from 'vue'
import type { TraceStep } from '../lib/galois/types.ts'

const props = defineProps<{
  leftLabel: string
  rightLabel: string
  resultLabel: string
  steps: readonly TraceStep[]
}>()

const multiplicationStep = computed(() => props.steps.find((step) => step.operation === 'field-mul'))

function coefficients(name: string): readonly bigint[] {
  return multiplicationStep.value?.intermediates?.[name] ?? []
}

function expressionOperand(label: string): string {
  return label.includes(' + ') ? `(${label})` : label
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

function formatWithReduction(values: readonly bigint[]): string {
  const terms: string[] = []
  for (let exponent = values.length - 1; exponent >= 0; exponent -= 1) {
    const coefficient = values[exponent]
    if (coefficient === undefined || coefficient === 0n) continue

    if (exponent === 2 && coefficient === 1n) {
      terms.push('(α + 1)')
      continue
    }

    const variable = exponent === 0 ? '' : exponent === 1 ? 'α' : `α${superscript(exponent)}`
    const coefficientText = coefficient === 1n && variable !== '' ? '' : coefficient.toString()
    terms.push(`${coefficientText}${variable}`)
  }
  return terms.join(' + ') || '0'
}

function superscript(value: number): string {
  return String(value).replace(/[0-9]/g, (digit) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)] ?? digit)
}
</script>

<template>
  <section class="operation-steps" aria-label="Operation derivation">
    <div class="steps-heading">
      <span class="eyebrow">Derivation</span>
      <span class="modulus">GF(2²), m(x) = x² + x + 1</span>
    </div>

    <div v-if="multiplicationStep" class="steps-list">
      <div class="step">
        <span class="step-number">1</span>
        <div>
          <strong>Expand</strong>
          <span class="math-line">
            {{ expressionOperand(props.leftLabel) }} × {{ expressionOperand(props.rightLabel) }} =
            {{ formatPolynomial(coefficients('rawProduct')) }}
          </span>
        </div>
      </div>

      <div class="step">
        <span class="step-number">2</span>
        <div>
          <strong>Reduce with α² = α + 1</strong>
          <span class="math-line">
            {{ formatPolynomial(coefficients('rawProduct')) }}
            <template v-if="formatWithReduction(coefficients('rawProduct')) !== formatPolynomial(coefficients('rawProduct'))">
              = {{ formatWithReduction(coefficients('rawProduct')) }}
            </template>
            = {{ formatPolynomial(coefficients('remainder')) }}
          </span>
        </div>
      </div>

      <div class="trace-note">
        Core trace: quotient {{ formatPolynomial(coefficients('quotient')) }},
        remainder {{ formatPolynomial(coefficients('remainder')) }}
      </div>
    </div>

    <p v-else class="empty-steps">Choose operands and calculate to see the core trace.</p>
  </section>
</template>

<style scoped>
.operation-steps {
  min-height: 8.8rem;
  padding: 1rem 1.15rem;
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
  margin-bottom: 0.7rem;
}

.eyebrow {
  color: #93c5fd;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.modulus,
.trace-note,
.empty-steps {
  color: #cbd5e1;
  font-size: 0.78rem;
}

.steps-list {
  display: grid;
  gap: 0.65rem;
}

.step {
  display: grid;
  grid-template-columns: 1.65rem 1fr;
  align-items: start;
  gap: 0.55rem;
}

.step-number {
  display: grid;
  width: 1.4rem;
  height: 1.4rem;
  place-items: center;
  border-radius: 999px;
  background: #2563eb;
  color: white;
  font-size: 0.78rem;
  font-weight: 700;
}

.step strong {
  display: block;
  color: #e0f2fe;
  font-size: 0.84rem;
}

.math-line {
  display: block;
  margin-top: 0.16rem;
  color: #f8fafc;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.92rem;
}

.trace-note {
  padding-top: 0.25rem;
  border-top: 1px dashed rgba(148, 163, 184, 0.25);
}

.empty-steps {
  margin: 0;
}
</style>
