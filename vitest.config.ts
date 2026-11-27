import { defineConfig } from 'vitest/config'
import multimdTable from 'markdown-it-multimd-table'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
  slidev: {
    markdown: {
      markdownItSetup(md) {
        md.use(multimdTable, {
          rowspan: true,
          multiline: true,
          headerless: true,
          multibody: true,
          autolabel: true,
        })
      },
    },
  },
})
