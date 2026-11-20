/** Mandatory acceptance evidence. Cases are recorded BEFORE the assertion. */
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { expect } from 'vitest'

export type CaseRecord = {
  id: string
  suite: string // basename: prime-field.test.ts etc.
  component: 'prime-field' | 'polynomial' | 'algorithms' | 'finite-field' | 'trace'
  item: string
  input: unknown
  expected: unknown
  actual: unknown
  note: string
}

function normalize(value: unknown): unknown {
  if (typeof value === 'bigint') return `${value}n`
  if (value === undefined) return { $undefined: true }
  if (Array.isArray(value)) return value.map(normalize)
  if (value instanceof Error) return { error: value.name, message: value.message }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v)]))
  }
  return value
}

export function observeCase(testCase: CaseRecord): void {
  const actual = normalize(testCase.actual)
  const expected = normalize(testCase.expected)
  const passed = isDeepStrictEqual(actual, expected)
  const file = process.env.GF_TEST_RECORDS
  if (file) {
    mkdirSync(dirname(file), { recursive: true })
    appendFileSync(file, `${JSON.stringify({
      ...testCase, input: normalize(testCase.input), expected, actual,
      passed, observedAt: new Date().toISOString(),
    })}
`, { encoding: 'utf8', flag: 'a' })
  }
  expect(actual, `case ${testCase.id}: ${testCase.item}`).toEqual(expected)
}
