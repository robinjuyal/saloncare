import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',   // ← expose to network
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',  // ← your actual IP
        changeOrigin: true
      },
      '/ws': {
        target: 'http://localhost:8080',  // ← your actual IP
        
        ws: true,
        changeOrigin: true
      }
    }
  }
})
