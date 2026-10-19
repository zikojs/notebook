import { defineConfig } from 'vite';
import notebookViteResolver from "@zikojs/notebook-vite-resolver"

export default defineConfig({
    optimizeDeps: {
        exclude: ["preact"],
    },
    plugins: [
        notebookViteResolver({
            modules: [
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