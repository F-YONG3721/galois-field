<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

type BaseMode = 2 | 10 | 16

const base = ref<BaseMode>(2)
const polyHex = ref<number>(0x11b) // 0x11B (AES) or 0x11D (QR Code)
const inputA = ref('01010111') // 87 = 0x57
const inputB = ref('10000011') // 131 = 0x83

const currentStep = ref(0) // 0 = ready, 1..8 = x^0..x^7, 9 = final XOR
const inspectedK = ref<number | null>(null)
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

function toPolyHex(n: number): string {
  return `0x${n.toString(16).toUpperCase()}`
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
  shifted9: number
  bit9: number
  low8AfterShift: number
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
      list.push({
        k,
        prev: cur,
        shifted9: cur,
        bit9: 0,
        low8AfterShift: cur,
        value: cur,
        selected,
      })
    } else {
      const prev = cur
      const shifted9 = prev << 1
      const bit9 = (shifted9 >> 8) & 1
      const low8AfterShift = shifted9 & 0xff
      const next = bit9 === 1 ? (shifted9 ^ polyHex.value) : shifted9
      cur = next
      list.push({
        k,
        prev,
        shifted9,
        bit9,
        low8AfterShift,
        value: next,
        selected,
      })
    }
  }
  return list
})

const activeDetailStep = computed<ShiftStep | null>(() => {
  if (!steps.value.length) return null
  if (inspectedK.value !== null && steps.value[inspectedK.value]) {
    return steps.value[inspectedK.value]
  }
  if (currentStep.value >= 1 && currentStep.value <= 8) {
    return steps.value[currentStep.value - 1]
  }
  if (currentStep.value >= 9) {
    return steps.value.find(s => s.bit9 === 1) ?? steps.value[1]
  }
  return null
})

watch(currentStep, () => {
  inspectedK.value = null
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
  inspectedK.value = null
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
  }, 700)
}

onUnmounted(() => stopPlay())
</script>

<template>
  <div class="text-[11px] select-none space-y-1.5">
    <!-- Single-Line Compact Controls Bar -->
    <div class="flex items-center justify-between gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1">
      <div class="flex items-center gap-1">
        <button
          v-for="m in ([2, 10, 16] as const)"
          :key="m"
          class="px-1.5 py-0.5 rounded border text-[11px] transition"
          :class="base === m ? 'bg-sky-500/30 border-sky-400 text-sky-200 font-bold' : 'bg-white/5 border-white/15 opacity-70 hover:opacity-100'"
          @click="switchBase(m)"
        >
          {{ m === 2 ? '二進位' : m === 10 ? '十進位' : '十六進位' }}
        </button>
      </div>

      <div class="flex items-center gap-1">
        <span class="opacity-75">A:</span>
        <input
          v-model="inputA"
          class="w-20 px-1.5 py-0.5 rounded bg-black/40 border border-white/20 font-mono text-[11px] text-white focus:border-sky-400 outline-none"
          @input="resetAnim"
        />
        <span class="opacity-75">× B:</span>
        <input
          v-model="inputB"
          class="w-20 px-1.5 py-0.5 rounded bg-black/40 border border-white/20 font-mono text-[11px] text-white focus:border-sky-400 outline-none"
          @input="resetAnim"
        />
        <select
          v-model.number="polyHex"
          class="px-1 py-0.5 rounded bg-black/50 border border-white/20 text-[11px] text-white outline-none ml-1"
          @change="resetAnim"
        >
          <option :value="0x11b">0x11B</option>
          <option :value="0x11d">0x11D</option>
        </select>
      </div>

      <div class="flex items-center gap-1">
        <button
          :disabled="!isValid"
          class="px-2 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/40 disabled:opacity-40"
          @click="togglePlay"
        >
          {{ isPlaying ? '⏸' : '▶ 播放' }}
        </button>
        <button
          :disabled="!isValid || currentStep >= 9"
          class="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-200 hover:bg-sky-500/35 disabled:opacity-40"
          @click="nextStep"
        >
          下一步({{ currentStep }}/9)
        </button>
        <button
          :disabled="!isValid"
          class="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 hover:bg-white/20 disabled:opacity-40"
          @click="showAll"
        >
          全顯示
        </button>
        <button
          class="px-1.5 py-0.5 rounded bg-white/5 border border-white/15 opacity-80 hover:opacity-100"
          @click="resetAnim"
        >
          重置
        </button>
      </div>
    </div>

    <!-- Binary Conversion Strip -->
    <div v-if="isValid" class="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-2.5 py-0.5 font-mono text-[11px]">
      <span><b class="text-sky-400">A</b> = {{ toBin8(valA!) }} <span class="opacity-60">({{ valA }} / {{ toHex2(valA!) }})</span></span>
      <span><b class="text-emerald-400">B</b> = {{ toBin8(valB!) }} <span class="opacity-60">({{ valB }} / {{ toHex2(valB!) }})</span></span>
      <span>9-bit 模數 m(x) = <b class="text-amber-300">1</b> {{ toBin8(lowPoly) }} <span class="opacity-60">({{ toPolyHex(polyHex) }})</span></span>
    </div>
    <div v-else class="bg-red-500/15 border border-red-400/40 rounded-lg px-3 py-1 text-red-300 font-bold">
      請輸入有效數值（十進位 0 ~ 255、二進位 8 bits、十六進位 00 ~ FF）
    </div>

    <!-- Main Grid (override Slidev default table cell padding with !py-1) -->
    <div v-if="isValid" class="grid grid-cols-12 gap-2">
      <!-- Left: 9-bit Shift + XOR Step Table -->
      <div class="col-span-7 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 [&_th]:!py-1 [&_td]:!py-1 [&_th]:!px-1.5 [&_td]:!px-1.5">
        <table class="w-full font-mono text-[11px] border-collapse !my-0">
          <thead>
            <tr class="border-b border-white/15 text-white/75">
              <th class="text-left">項次</th>
              <th class="text-center">左移後 (第9bit｜低8bit)</th>
              <th class="text-center">降次後 8-bit</th>
              <th class="text-center">B 位元</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in steps"
              :key="s.k"
              class="border-b border-white/5 cursor-pointer transition-all duration-150 hover:bg-white/10"
              :class="[
                s.k < currentStep ? 'opacity-100' : 'opacity-20',
                activeDetailStep?.k === s.k && currentStep > 0 ? 'bg-sky-500/20' : '',
              ]"
              @click="s.k < currentStep && (inspectedK = s.k)"
            >
              <td class="font-bold" :class="s.selected && s.k < currentStep ? 'text-emerald-300' : ''">
                x<sup>{{ s.k }}</sup>·A
              </td>
              <td class="text-center">
                <template v-if="s.k === 0">
                  <span class="opacity-50">初始值 (無左移)</span>
                </template>
                <template v-else>
                  <span
                    class="inline-block px-1 rounded font-bold mr-1 leading-tight"
                    :class="s.bit9 === 1 ? 'bg-red-500/35 border border-red-400 text-red-200' : 'bg-white/10 text-white/50'"
                  >{{ s.bit9 }}</span>
                  <span>{{ toBin8(s.low8AfterShift) }}</span>
                </template>
              </td>
              <td class="text-center font-bold" :class="s.bit9 === 1 ? 'text-amber-300' : ''">
                {{ toBin8(s.value) }}
              </td>
              <td class="text-center">
                <span v-if="s.selected" class="px-1 rounded bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 font-bold">1 ✓</span>
                <span v-else class="opacity-35">0</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="text-[10px] opacity-55 mt-0.5 text-right">💡 點擊任一已展開列可檢視該步第 9 bit 計算過程</div>
      </div>

      <!-- Right: 9th-Bit Calculation Detail + Final XOR -->
      <div class="col-span-5 flex flex-col gap-2">
        <!-- Box 1: 9-bit Overflow Calculation -->
        <div class="bg-white/5 border border-amber-400/40 rounded-lg p-2">
          <div class="font-bold text-amber-300 mb-1 flex justify-between">
            <span>第 9 Bit（x⁸）溢位計算過程</span>
            <span v-if="activeDetailStep" class="font-mono text-sky-300">x<sup>{{ activeDetailStep.k }}</sup>·A</span>
          </div>

          <div v-if="!activeDetailStep" class="opacity-65 py-1.5 leading-relaxed">
            按「▶ 播放」或「下一步」，觀察左移產生的<b>第 9 個 bit</b>如何觸發 XOR 降次！
          </div>
          <div v-else-if="activeDetailStep.k === 0" class="font-mono text-[11px] py-1 opacity-85">
            x⁰·A = <code>{{ toBin8(activeDetailStep.value) }}</code>（初始項不需左移）
          </div>
          <div v-else-if="activeDetailStep.bit9 === 0" class="font-mono text-[11px] space-y-0.5 py-0.5">
            <div>前項左移 1 位：<span class="px-1 rounded bg-white/10 text-white/60">0</span> {{ toBin8(activeDetailStep.low8AfterShift) }}</div>
            <div class="text-emerald-300 font-sans">✓ 第 9 bit = <b>0</b>（未溢位），直接保留低 8 bits！</div>
          </div>
          <div v-else class="font-mono text-[11px] bg-amber-500/10 border border-amber-400/30 rounded p-1.5 space-y-0.5">
            <div class="font-sans text-red-300 font-bold text-[10px]">⚠ 第 9 bit = 1（產生 x⁸ 溢位），XOR 9-bit 模數消去：</div>
            <div>　 <span class="px-1 rounded bg-red-500/35 text-red-200 font-bold">1</span> {{ toBin8(activeDetailStep.low8AfterShift) }} <span class="opacity-60">(左移 9-bit)</span></div>
            <div>⊕ <span class="px-1 rounded bg-amber-500/35 text-amber-200 font-bold">1</span> {{ toBin8(lowPoly) }} <span class="opacity-60">({{ toPolyHex(polyHex) }})</span></div>
            <div class="border-t border-white/20 pt-0.5 text-emerald-300 font-bold">
              = <span class="px-1 rounded bg-emerald-500/25">0</span> {{ toBin8(activeDetailStep.value) }} <span class="opacity-80">(壓回 8-bit!)</span>
            </div>
          </div>
        </div>

        <!-- Box 2: Final XOR Sum -->
        <div class="bg-white/5 border border-emerald-400/40 rounded-lg p-2 flex-1 flex flex-col justify-between">
          <div>
            <div class="font-bold text-emerald-400 mb-1">最後加總（B 位元為 1 的項 XOR）</div>
            <div v-if="currentStep < 9" class="opacity-65 leading-relaxed">
              完成 8 輪左移後，第 9 步會把綠色「1 ✓」選取項全部 XOR 相加得出乘積。
            </div>
            <div v-else class="font-mono text-[11px] max-h-24 overflow-y-auto space-y-0.5 pr-1">
              <div v-if="selectedSteps.length === 0" class="opacity-70">B = 0 → 00000000</div>
              <div v-for="(s, idx) in selectedSteps" :key="s.k" class="flex justify-between">
                <span class="opacity-75">{{ idx === 0 ? '  ' : '⊕ ' }}x<sup>{{ s.k }}</sup>·A</span>
                <span class="text-emerald-300 font-bold">{{ toBin8(s.value) }}</span>
              </div>
            </div>
          </div>

          <div
            v-if="currentStep >= 9"
            class="mt-1.5 pt-1.5 border-t border-white/20 bg-emerald-500/15 border border-emerald-400/40 rounded px-2 py-1 flex items-center justify-between font-mono"
          >
            <span class="font-sans text-[11px] font-bold text-emerald-200">最終乘積：</span>
            <span class="text-sm font-bold text-emerald-300">
              {{ toBin8(finalResult) }}
              <span class="text-[11px] text-white/85">({{ finalResult }} / {{ toHex2(finalResult) }})</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
