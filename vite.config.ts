import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'

export default defineConfig({
  // Relative assets make the same build work at any GitHub Pages repo path.
  base: './',
  plugins: [react()],
  optimizeDeps: { exclude: ['@typstyle/typstyle-wasm-bundler'] },
  worker: { format: 'es', plugins: () => [wasm()] },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
