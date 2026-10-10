import { defineConfig } from 'vite';
import notebookResolver from './nb-resolver.js'

export default defineConfig({
  plugins:[
    notebookResolver()
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom/client",
      "react/jsx-runtime",
    ],
  },
});