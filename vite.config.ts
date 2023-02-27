import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from "@originjs/vite-plugin-federation";

const production = process.env.NODE_ENV==='production';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    federation({
        name: 'QuadSphere',
        filename: 'remoteEntry.js',
        // Modules to expose
        exposes: {
          './QuadSphereModule': './src/App.tsx',
        }
    })
  ],
  server: {
    hmr: {
      clientPort: process.env.CODESPACES ? 443 : undefined
    },
    port: 4500
  },
  build: {
    outDir: production ? './docs' : undefined
  },
  base: production ? '/QuadSphere/' : undefined
})
