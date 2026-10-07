import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    noExternal: ['react'],
  },
  optimizeDeps: {
    include: ['canvas-confetti']
  }
});