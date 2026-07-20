import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  base: "/app/",
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [react()],
  build: {
    // App fica em dist/app/ para coexistir com a landing estática (dist/index.html),
    // copiada por scripts/copy-landing.mjs no mesmo build.
    outDir: "dist/app",
    // contractDocs.ts (docx/jsPDF) só é carregado via import() dinâmico, sob demanda,
    // quando o usuário clica em exportar/baixar — não faz parte do carregamento inicial
    // de nenhuma rota, então o limite padrão de 500kB não se aplica a esse chunk lazy.
    chunkSizeWarningLimit: 800,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: [".triviaiox-core/**", "node_modules/**"],
  },
});
