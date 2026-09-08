import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  root: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html')
      },
      output: {
        manualChunks: {
          vendor: ['three', 'cannon-es'],
          core: ['./src/core/**/*.ts'],
          entities: ['./src/entities/**/*.ts'],
          systems: ['./src/systems/**/*.ts']
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
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@entities': resolve(__dirname, 'src/entities'),
      '@systems': resolve(__dirname, 'src/systems'),
      '@scenes': resolve(__dirname, 'src/scenes'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@assets': resolve(__dirname, 'public/assets')
    }
  },
  optimizeDeps: {
    include: ['three', 'cannon-es']
  }
})
