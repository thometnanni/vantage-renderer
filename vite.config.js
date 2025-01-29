// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      // eslint-disable-next-line no-undef
      entry: resolve(__dirname, 'src/main.js'),
      name: 'vantage-renderer',
      fileName: 'vantage-renderer'
    }
  }
})
