import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "src/loquace.js"),
            name: "kaplay-loquace",
            fileName: "kaplay-loquace",
        },
        rollupOptions: {
            external: ["kaplay"],
        },
        sourcemap: true,
    },
})