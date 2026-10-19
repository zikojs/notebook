import { defineConfig } from 'vite';
import { notebookViteResolver } from './resolver.js'

export default defineConfig({
    plugins: [
        notebookViteResolver(),
    ],
    build:{
        rolldownOptions:{
            output:{
                codeSplitting : true
            }
        }
    }
});