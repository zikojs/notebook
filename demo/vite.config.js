import { defineConfig } from 'vite';
import notebookResolver from './nb-resolver.js'

export default defineConfig({
  plugins:[
    notebookResolver()
  ],
  // optimizeDeps: {
  //   include: ['canvas-confetti', "ziko/dom","ziko"]
  // }
});