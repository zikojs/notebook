import { defineConfig } from 'vite';
import notebookImports from './vv.js'

export default defineConfig({
  plugins:[
    notebookImports()
  ],
  resolve: {
    noExternal: ['react'],
  },
  optimizeDeps: {
    include: ['canvas-confetti']
  }
});