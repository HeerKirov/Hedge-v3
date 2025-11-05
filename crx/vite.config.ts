import path from 'path'
import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import manifest from './manifest.config'

// https://vitejs.dev/config/

export default defineConfig({
  plugins: [
    react(),
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    crx({ manifest })
  ],
  server: {
    strictPort: true,
    port: 5174,
    hmr: {
        clientPort: 5174
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
})
