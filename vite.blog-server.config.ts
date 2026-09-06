import { defineConfig } from "vite";
export default defineConfig({
  build: {
    ssr: "lib/renderBlog.tsx",
    outDir: "dist-ssr",
    rollupOptions: { output: { entryFileNames: "renderBlog.mjs" } },
  },
  ssr: { noExternal: true },
});
