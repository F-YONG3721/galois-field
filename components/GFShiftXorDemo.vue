<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

type BaseMode = 2 | 10 | 16

const base = ref<BaseMode>(2)
const polyHex = ref<number>(0x11b) // 0x11B (AES) or 0x11D (QR Code)
const inputA = ref('01010111') // 87 = 0x57
const inputB = ref('10000011') // 131 = 0x83

const currentStep = ref(0) // 0 = ready, 1..8 = x^0..x^7, 9 = final XOR
const isPlaying = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

function parseByte(raw: string, radix: BaseMode): number | null {
  const cleaned = raw.trim().replace(/^0x/i, '').replace(/^0b/i, '').replace(/\s+/g, '')
  if (!cleaned) return null
  const pattern = radix === 2 ? /^[01]+$/ : radix === 10 ? /^[0-9]+$/ : /^[0-9a-fA-F]+$/
  if (!pattern.test(cleaned)) return null
  const val = Number.parseInt(cleaned, radix)
  if (Number.isNaN(val) || val < 0 || val > 255) return null
  return val
}

function toBin8(n: number): string {
  return (n & 0xff).toString(2).padStart(8, '0')
}

function toHex2(n: number): string {
  return `0x${(n & 0xff).toString(16).toUpperCase().padStart(2, '0')}`
}

function formatInBase(n: number, radix: BaseMode): string {
  if (radix === 2) return toBin8(n)
  if (radix === 16) return (n & 0xff).toString(16).toUpperCase().padStart(2, '0')
  return String(n & 0xff)
}

function switchBase(newBase: BaseMode) {
  const a = parseByte(inputA.value, base.value)
  const b = parseByte(inputB.value, base.value)
  base.value = newBase
  if (a !== null) inputA.value = formatInBase(a, newBase)
  if (b !== null) inputB.value = formatInBase(b, newBase)
}

const valA = computed(() => parseByte(inputA.value, base.value))
const valB = computed(() => parseByte(inputB.value, base.value))
const isValid = computed(() => valA.value !== null && valB.value !== null)
const lowPoly = computed(() => polyHex.value & 0xff)

interface ShiftStep {
  k: number
  prev: number
  b7: boolean
  shifted: number
  value: number
  selected: boolean
}

const steps = computed<ShiftStep[]>(() => {
  if (valA.value === null || valB.value === null) return []
  const list: ShiftStep[] = []
  let cur = valA.value
  for (let k = 0; k < 8; k++) {
    const selected = ((valB.value >> k) & 1) === 1
    if (k === 0) {
      list.push({ k, prev: cur, b7: false, shifted: cur, value: cur, selected })
    } else {
      const prev = cur
      const b7 = (prev & 0x80) !== 0
      const shifted = (prev << 1) & 0xff
      const next = b7 ? shifted ^ lowPoly.value : shifted
      cur = next
      list.push({ k, prev, b7, shifted, value: next, selected })
    }
  }
  return list
})

const selectedSteps = computed(() => steps.value.filter(s => s.selected))
const finalResult = computed(() =>
  selectedSteps.value.reduce((acc, s) => acc ^ s.value, 0),
)

function stopPlay() {
  isPlaying.value = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function resetAnim() {
  stopPlay()
  currentStep.value = 0
}

function nextStep() {
  stopPlay()
  if (currentStep.value < 9) currentStep.value++
}

function showAll() {
  stopPlay()
  currentStep.value = 9
}

function togglePlay() {
  if (isPlaying.value) {
    stopPlay()
    return
  }
  if (currentStep.value >= 9) currentStep.value = 0
  isPlaying.value = true
  timer = setInterval(() => {
    if (currentStep.value < 9) {
      currentStep.value++
    } else {
      stopPlay()
    }
  }, 600)
}

onUnmounted(() => stopPlay())
</script>

<template>
  <div class="text-xs select-none space-y-2">
    <!-- Controls Bar -->
    <div class="flex flex-wrap items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
      <!-- Base selector -->
      <div class="flex items-center gap-1">
        <span class="opacity-70">輸入進位：</span>
        <button
          v-for="m in ([2, 10, 16] as const)"
          :key="m"
          class="px-2 py-0.5 rounded border text-xs transition"
          :class="base === m ? 'bg-sky-500/30 border-sky-400 text-sky-200 font-bold' : 'bg-white/5 border-white/15 opacity-70 hover:opacity-100'"
          @click="switchBase(m)"
        >
          {{ m === 2 ? '二進位' : m === 10 ? '十進位' : '十六進位' }}
        </button>
      </div>

      <!-- Inputs -->
      <div class="flex items-center gap-1.5 ml-1">
        <label class="opacity-75">A:</label>
        <input
          v-model="inputA"
          class="w-24 px-2 py-0.5 rounded bg-black/40 border border-white/20 font-mono text-xs text-white focus:border-sky-400 outline-none"
          @input="resetAnim"
        />
        <span class="opacity-75">×</span>
        <label class="opacity-75">B:</label>
        <input
          v-model="inputB"
          class="w-24 px-2 py-0.5 rounded bg-black/40 border border-white/20 font-mono text-xs text-white focus:border-sky-400 outline-none"
          @input="resetAnim"
        />
      </div>

      <!-- Modulus selector -->
      <div class="flex items-center gap-1 ml-auto">
        <span class="opacity-70">模數：</span>
        <select
          v-model.number="polyHex"
          class="px-1.5 py-0.5 rounded bg-black/50 border border-white/20 text-xs text-white outline-none"
          @change="resetAnim"
        >
          <option :value="0x11b">0x11B (AES)</option>
          <option :value="0x11d">0x11D (QR)</option>
        </select>
      </div>
    </div>

    <!-- Binary Conversion + Playback Buttons -->
    <div class="flex flex-wrap items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
      <div v-if="isValid" class="font-mono flex flex-wrap items-center gap-3">
        <span>
          <b class="text-sky-400">A</b> = <code>{{ toBin8(valA!) }}</code>
          <span class="opacity-65">({{ valA }} / {{ toHex2(valA!) }})</span>
        </span>
        <span>
          <b class="text-emerald-400">B</b> = <code>{{ toBin8(valB!) }}</code>
          <span class="opacity-65">({{ valB }} / {{ toHex2(valB!) }})</span>
        </span>
        <span class="opacity-75">
          低 8 位 XOR 模數：<code>{{ toBin8(lowPoly) }}</code>
        </span>
      </div>
      <div v-else class="text-red-400 font-bold">
        請輸入有效數值（範圍 0 ~ 255）
      </div>

      <div class="flex items-center gap-1.5">
        <button
          :disabled="!isValid"
          class="px-2.5 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/40 disabled:opacity-40"
          @click="togglePlay"
        >
          {{ isPlaying ? '⏸ 暫停' : '▶ 播放動畫' }}
        </button>
        <button
          :disabled="!isValid || currentStep >= 9"
          class="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-200 hover:bg-sky-500/35 disabled:opacity-40"
          @click="nextStep"
        >
          下一步 ({{ currentStep }}/9)
        </button>
        <button
          :disabled="!isValid"
          class="px-2 py-0.5 rounded bg-white/10 border border-white/20 hover:bg-white/20 disabled:opacity-40"
          @click="showAll"
        >
          全部顯示
        </button>
        <button
          class="px-2 py-0.5 rounded bg-white/5 border border-white/15 opacity-80 hover:opacity-100"
          @click="resetAnim"
        >
          重置
        </button>
      </div>
    </div>

    <!-- Step-by-step Shift + XOR Table -->
    <div v-if="isValid" class="grid grid-cols-12 gap-2">
      <div class="col-span-8 bg-white/5 border border-white/10 rounded-lg p-2">
        <table class="w-full font-mono text-[11px] border-collapse">
          <thead>
            <tr class="border-b border-white/15 text-white/70">
              <th class="py-0.5 text-left px-1">項次</th>
              <th class="py-0.5 text-left px-1">Shift + 溢位判斷</th>
              <th class="py-0.5 text-center px-1">結果 (8-bit)</th>
              <th class="py-0.5 text-center px-1">B 的第 k 位</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in steps"
              :key="s.k"
              class="border-b border-white/5 transition-all duration-300"
              :class="[
                s.k < currentStep ? 'opacity-100' : 'opacity-15',
                s.k === currentStep - 1 ? 'bg-sky-500/20' : '',
                s.k < currentStep && s.selected ? 'text-emerald-300' : '',
              ]"
            >
              <td class="py-0.5 px-1 font-bold">x<sup>{{ s.k }}</sup>·A</td>
              <td class="py-0.5 px-1">
                <template v-if="s.k === 0">初始值 A</template>
                <template v-else>
                  左移 <code>{{ toBin8(s.shifted) }}</code>
                  <span v-if="s.b7" class="text-amber-300 font-bold"> ⊕ {{ toBin8(lowPoly) }} (b₇=1)</span>
                  <span v-else class="opacity-60"> (b₇=0)</span>
                </template>
              </td>
              <td class="py-0.5 px-1 text-center font-bold">{{ toBin8(s.value) }}</td>
              <td class="py-0.5 px-1 text-center">
                <span v-if="s.selected" class="px-1.5 py-0.2 rounded bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 font-bold">1 ✓ 選取</span>
                <span v-else class="opacity-40">0</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Final XOR Aggregation Panel -->
      <div class="col-span-4 bg-white/5 border border-white/10 rounded-lg p-2.5 flex flex-col justify-between">
        <div>
          <div class="font-bold text-emerald-400 mb-1.5">最後加總（XOR 選取項）</div>
          <div v-if="currentStep < 9" class="opacity-60 leading-relaxed">
            點按「▶ 播放動畫」或「下一步」，依序計算 x⁰·A ~ x⁷·A，最後會把 B 為 <b>1</b> 的對應項全部 XOR！
          </div>
          <div v-else class="font-mono space-y-1">
            <div v-if="selectedSteps.length === 0" class="opacity-70">B = 0 → 結果為 00000000</div>
            <div v-for="(s, idx) in selectedSteps" :key="s.k" class="flex justify-between">
              <span class="opacity-75">{{ idx === 0 ? '  ' : '⊕ ' }}x<sup>{{ s.k }}</sup>·A</span>
              <span class="text-emerald-300 font-bold">{{ toBin8(s.value) }}</span>
            </div>
          </div>
        </div>

        <div
          v-if="currentStep >= 9"
          class="mt-2 pt-2 border-t border-white/20 bg-emerald-500/15 border border-emerald-400/50 rounded p-2 text-center"
        >
          <div class="text-[11px] opacity-80">最終乘積（mod {{ toHex2(polyHex) }}）</div>
          <div class="font-mono text-base font-bold text-emerald-300">{{ toBin8(finalResult) }}</div>
          <div class="font-mono text-[11px] opacity-85">
            十進位 <b>{{ finalResult }}</b> ｜ 十六進位 <b>{{ toHex2(finalResult) }}</b>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
