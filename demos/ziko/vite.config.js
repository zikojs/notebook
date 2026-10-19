import { defineConfig } from 'vite';
import { notebookViteResolver } from './resolver.js'

export default defineConfig({
    plugins: [
        notebookViteResolver({
            packages: [
                "ziko/dom",
                "preact",
                "preact/hooks",
                "react",
                "react-dom/client",
            ]
        }),
    ],
    build:{
        rolldownOptions:{
            output:{
                codeSplitting : true
            }
        }
    }
});