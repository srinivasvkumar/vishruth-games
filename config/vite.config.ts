import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

// NOTE: this config file lives in <repo>/config/, so __dirname === <repo>/config.
// Root-anchored values must therefore point one level up to the repo root
// (Task 0.2.1 fix). Values relative to `root` (publicDir, test.include,
// setupFiles, coverage paths) resolve against the repo root as expected.
export default defineConfig({
  base: './',
  root: resolve(__dirname, '..'),
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, '../public/index.html')
      },
      output: {
        // NOTE: rollup manualChunks object values must be resolvable module
        // specifiers — glob patterns ('./src/core/**/*.ts') are NOT expanded
        // and break the build. Vendor splitting only.
        manualChunks: {
          vendor: ['three', 'cannon-es']
        }
      }
    }
  },
  server: {
    port: 5173,
    open: true,
    host: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
      '@core': resolve(__dirname, '../src/core'),
      '@entities': resolve(__dirname, '../src/entities'),
      '@systems': resolve(__dirname, '../src/systems'),
      '@scenes': resolve(__dirname, '../src/scenes'),
      '@utils': resolve(__dirname, '../src/utils'),
      '@assets': resolve(__dirname, '../public/assets')
    }
  },
  optimizeDeps: {
    include: ['three', 'cannon-es']
  },
  test: {
    // Enable Vitest
    globals: true,
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    // Task 0.2.1: <repo>/clusterrush/ is a nested duplicate of the root
    // src/ + tests/ + tracker/ trees (out-of-scope copy). The root-anchored
    // include pattern does not collect it (verified empirically in
    // tests/evidence/d02/T1-nested-tree-check.txt), but the exclude is kept
    // as an explicit guard so a future include-pattern change can never
    // silently pick up the duplicate tree.
    exclude: ['node_modules', 'dist', 'clusterrush/**'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules',
        'dist',
        'tests/**',
        '**/*.d.ts'
      ],
      thresholds: {
        global: {
          branches: 0,
          functions: 0,
          lines: 0,
          statements: 0
        }
      }
    },

    // Test timeout
    testTimeout: 10000,

    // Mock three.js and cannon-es for unit tests
    mockReset: true,
    setupFiles: ['tests/setup/mock-three.ts', 'tests/setup/mock-cannon.ts']
  }
})
