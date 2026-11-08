/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Keep the libraries apart from our code, so a change to the app doesn't make
        // browsers download MUI and React again.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'mui', test: /node_modules[\\/](@mui|@emotion|@material)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Whole-page tests type into several search boxes; on a busy machine they can take more
    // than the default 5 seconds.
    testTimeout: 15_000,
    // The colour library ships imports without file extensions, so let Vite resolve them.
    server: { deps: { inline: ['@material/material-color-utilities'] } },
  },
})
