/// <reference types="vitest/config" />
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  return {
    define: {
      __DEV__: mode === 'development',
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    plugins: [
      vue(),
    ],
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['color-functions', 'global-builtin', 'import'],
        },
      },
    },
    test: {
      include: [
        'src/**/*.{test,spec}.ts',
        'tests/**/*.{test,spec}.ts',
      ],
      setupFiles: [
        fileURLToPath(new URL('./tests/vitest-setup.ts', import.meta.url)),
      ],
      environment: 'jsdom',
      typecheck: {
        enabled: true,
        tsconfig: 'tsconfig.json',
        include: [
          '**/*.test.ts',
          '**/*.test-d.ts',
        ],
        checker: 'vue-tsc',
      },
      mockReset: true,
      coverage: {
        enabled: false,
        provider: 'v8',
        reporter: ['text', 'lcovonly', 'html'],
        include: ['src/**/*', 'tests/**/*.vue'],
        exclude: ['tests/**/*.ts'],
      },
    },
  }
})
