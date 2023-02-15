import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      clientPort: process.env.CODESPACES ? 443 : undefined
    },
    port: 4500
  }
})
