import { defineConfig } from 'vite';
import { notebookViteResolver } from './resolver.js'

export default defineConfig({
    plugins: [
        notebookViteResolver({
            packages: [
                "ziko",
                "ziko/dom",
                "ziko/hooks",
                "preact",
                "preact/hooks",
                "preact/jsx-runtime",
                "react",
                "react-dom/client",
                "react/jsx-runtime",
                "vanjs-core"
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