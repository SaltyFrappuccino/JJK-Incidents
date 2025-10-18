import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://95.81.121.225:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://95.81.121.225:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})

