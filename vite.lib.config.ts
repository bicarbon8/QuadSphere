import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'QuadSphere',
      fileName: () => `index.js`
    },
    rollupOptions: {
      external: ['three', 'react', 'react-dom', '@react-three/fiber', '@react-three/drei'],
      output: {
        globals: {
          three: 'Three',
          react: 'React',
          'react-dom': 'ReactDom',
          '@react-three/fiber': 'R3F',
          '@react-three/drei': 'R3D'
        },
        inlineDynamicImports: false,
        format: 'esm'
      }
    }
  },
  plugins: [
    react()
  ]
})
