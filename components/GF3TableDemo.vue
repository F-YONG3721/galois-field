<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

const POLY = 0b1101 // x^3 + x^2 + 1

interface BuildStep {
  i: number
  val: number
  shifted4: number
  bit4: number
  nextVal: number
}

const polyNames: Record<number, string> = {
  0: '0',
  1: '1',
  2: 'x',
  3: 'x+1',
  4: 'x²',
  5: 'x²+1',
  6: 'x²+x',
  7: 'x²+x+1',
}

function toBin3(n: number): string {
  return (n & 0b111).toString(2).padStart(3, '0')
}

function toBin4(n: number): string {
  return (n & 0b1111).toString(2).padStart(4, '0')
}

const buildSteps: BuildStep[] = (() => {
  const arr: BuildStep[] = []
  let val = 1
  for (let i = 0; i < 7; i++) {
    const shifted4 = val << 1
    const bit4 = (shifted4 >> 3) & 1
    const nextVal = bit4 ? (shifted4 ^ POLY) : shifted4
    arr.push({ i, val, shifted4, bit4, nextVal })
    val = nextVal
  }
  return arr
})()

// step 0 = empty, 1..7 = i=0..6, 8 = exp_table[7] = 001 completed
const step = ref(0)
const isPlaying = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const currentInfo = computed(() => {
  if (step.value >= 1 && step.value <= 7) return buildSteps[step.value - 1]
  return null
})

const expDisplay = computed(() => {
  const res: (number | null)[] = Array.from({ length: 8 }, () => null)
  for (let s = 0; s < Math.min(step.value, 7); s++) {
    res[s] = buildSteps[s].val
  }
  if (step.value >= 8) res[7] = 1
  return res
})

const logDisplay = computed(() => {
  const res: (number | null)[] = Array.from({ length: 8 }, () => null)
  for (let s = 0; s < Math.min(step.value, 7); s++) {
    res[buildSteps[s].val] = s
  }
  return res
})

function stopPlay() {
  isPlaying.value = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function reset() {
  stopPlay()
  step.value = 0
}

function next() {
  stopPlay()
  if (step.value < 8) step.value++
}

function showAll() {
  stopPlay()
  step.value = 8
}

function togglePlay() {
  if (isPlaying.value) {
    stopPlay()
    return
  }
  if (step.value >= 8) step.value = 0
  isPlaying.value = true
  timer = setInterval(() => {
    if (step.value < 8) {
      step.value++
    } else {
      stopPlay()
    }
  }, 850)
}

onUnmounted(() => stopPlay())
</script>

<template>
  <div class="text-xs select-none space-y-2.5 mt-1">
    <!-- Control Bar -->
    <div class="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
      <div class="font-mono text-[11px]">
        模數 <code>poly = 1101</code>（x³+x²+1）｜生成元 <code>g = 010</code>（x）｜共 8 格（0 ~ 7）
      </div>
      <div class="flex items-center gap-1.5">
        <button
          class="px-2.5 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/40"
          @click="togglePlay"
        >
          {{ isPlaying ? '⏸ 暫停' : '▶ 播放建表' }}
        </button>
        <button
          :disabled="step >= 8"
          class="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-200 hover:bg-sky-500/35 disabled:opacity-40"
          @click="next"
        >
          下一步 ({{ step }}/8)
        </button>
        <button
          class="px-2 py-0.5 rounded bg-white/10 border border-white/20 hover:bg-white/20"
          @click="showAll"
        >
          全顯示
        </button>
        <button
          class="px-2 py-0.5 rounded bg-white/5 border border-white/15 opacity-80 hover:opacity-100"
          @click="reset"
        >
          重置
        </button>
      </div>
    </div>

    <!-- Live Tables: exp_table & log_table in 3-bit Binary -->
    <div class="space-y-2">
      <!-- exp_table -->
      <div class="bg-white/5 border border-sky-400/40 rounded-xl px-3 py-2 [&_th]:!py-1 [&_td]:!py-1">
        <div class="font-bold text-sky-300 mb-1">
          正向表 <code>exp_table[步數 i] = 二進位多項式</code>
        </div>
        <table class="w-full text-center font-mono text-xs border-collapse !my-0">
          <thead>
            <tr class="border-b border-white/15 text-white/70">
              <th class="text-left px-1">步數 i</th>
              <th v-for="idx in 8" :key="idx - 1">{{ idx - 1 }}</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-white/10">
              <td class="text-left px-1 font-sans text-white/75">二進位 val</td>
              <td
                v-for="(v, idx) in expDisplay"
                :key="idx"
                class="font-bold transition-all duration-200"
                :class="[
                  v !== null ? 'text-sky-200' : 'opacity-25',
                  (currentInfo?.i === idx || (step === 8 && idx === 7)) ? 'bg-sky-500/30 rounded text-amber-300' : '',
                ]"
              >
                {{ v !== null ? toBin3(v) : '---' }}
              </td>
            </tr>
            <tr>
              <td class="text-left px-1 font-sans text-white/60 text-[11px]">對應多項式</td>
              <td
                v-for="(v, idx) in expDisplay"
                :key="idx"
                class="text-[11px] opacity-80"
              >
                {{ v !== null ? polyNames[v] : '' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- log_table -->
      <div class="bg-white/5 border border-emerald-400/40 rounded-xl px-3 py-2 [&_th]:!py-1 [&_td]:!py-1">
        <div class="font-bold text-emerald-300 mb-1">
          反向表 <code>log_table[二進位多項式] = 步數 i</code>
        </div>
        <table class="w-full text-center font-mono text-xs border-collapse !my-0">
          <thead>
            <tr class="border-b border-white/15 text-white/70">
              <th class="text-left px-1">索引 (二進位)</th>
              <th v-for="idx in 8" :key="idx - 1">{{ toBin3(idx - 1) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left px-1 font-sans text-white/75">步數 log</td>
              <td
                v-for="(l, idx) in logDisplay"
                :key="idx"
                class="font-bold transition-all duration-200"
                :class="[
                  idx === 0 ? 'opacity-40' : l !== null ? 'text-emerald-300' : 'opacity-25',
                  currentInfo?.val === idx ? 'bg-emerald-500/30 rounded text-amber-300' : '',
                ]"
              >
                {{ idx === 0 ? '無' : l !== null ? l : '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Step-by-Step Binary Calculation Trace -->
    <div class="bg-white/5 border border-amber-400/40 rounded-xl px-3.5 py-2.5 min-h-22 flex items-center justify-between">
      <div v-if="step === 0" class="opacity-70">
        點按上方「<b>▶ 播放建表</b>」或「<b>下一步</b>」，一步步觀察 C++ 迴圈如何用二進位左移與 XOR <code>1101</code> 同時填好兩張表！
      </div>

      <div v-else-if="currentInfo" class="w-full grid grid-cols-12 gap-3 items-center font-mono">
        <div class="col-span-5 space-y-0.5">
          <div class="font-sans font-bold text-amber-300">
            迴圈第 i = {{ currentInfo.i }} 步（當前 val = {{ toBin3(currentInfo.val) }} = {{ polyNames[currentInfo.val] }}）
          </div>
          <div>① 寫入 <code>exp_table[{{ currentInfo.i }}] = {{ toBin3(currentInfo.val) }}</code></div>
          <div>② 寫入 <code>log_table[{{ toBin3(currentInfo.val) }}] = {{ currentInfo.i }}</code></div>
        </div>

        <div class="col-span-7 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 space-y-0.5">
          <div class="font-sans text-[11px] opacity-80">③ 計算下一步的 val（左移 1 位乘上 x）：</div>
          <div v-if="currentInfo.bit4 === 0">
            <code>{{ toBin3(currentInfo.val) }} &lt;&lt; 1</code> =
            <span class="px-1 rounded bg-white/10 text-white/60">0</span><code>{{ toBin3(currentInfo.shifted4) }}</code>
            <span class="font-sans text-emerald-300 ml-1">（第 4 bit 為 0 未溢位 → 下一步 val = <b>{{ toBin3(currentInfo.nextVal) }}</b>）</span>
          </div>
          <div v-else class="text-amber-200">
            <code>{{ toBin3(currentInfo.val) }} &lt;&lt; 1</code> =
            <span class="px-1 rounded bg-red-500/35 text-red-200 font-bold">1</span><code>{{ toBin3(currentInfo.shifted4) }}</code>
            <span class="font-sans text-red-300 font-bold">（溢位！）</span>
            → <code>{{ toBin4(currentInfo.shifted4) }} ⊕ 1101</code> =
            <b class="text-emerald-300">0{{ toBin3(currentInfo.nextVal) }}</b>
            <span class="font-sans text-emerald-300">（壓回 3-bit：<b>{{ toBin3(currentInfo.nextVal) }}</b>）</span>
          </div>
        </div>
      </div>

      <div v-else class="w-full flex items-center justify-between">
        <div>
          <span class="font-bold text-emerald-300">迴圈結束！補上最後一格 <code>exp_table[7] = 001</code></span>
          <span class="opacity-80 ml-2">（走滿 7 步剛好把 7 個非零二進位全部走完一遍，第 7 步繞回起點 <code>001</code>！）</span>
        </div>
      </div>
    </div>
  </div>
</template>
