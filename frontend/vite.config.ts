import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [vue()],
  css: {
    modules: {
      localsConvention: "camelCase"
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if(id.includes('src/components/')) {
            return 'components'
          }
          if(id.includes('src/components-business/')) {
            return 'components-business'
          }
          if(id.includes('src/components-module/')) {
            return 'components-module'
          }
          if(id.includes('src/views/Main/')) {
            return 'views-Main'
          }
          if(id.includes('src/views/Setting/')) {
            return 'views-Setting'
          }
          if(id.includes('src/views/Test/')) {
            return 'views-Test'
          }
          if(id.includes('src/views/')) {
            return 'views-Others'
          }
          if(id.includes('node_modules/')) {
            return 'dependencies'
          }
        }
      }
    }
  }
})
