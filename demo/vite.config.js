import { defineConfig } from 'vite';

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