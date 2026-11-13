import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./app/App";
import { env } from "@/config/env";

if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: import.meta.env.MODE,         // "development" | "production"
    // Captura apenas 10% das sessões em dev para não poluir o painel
    tracesSampleRate: import.meta.env.PROD ? 1.0 : 0.1,
    replaysSessionSampleRate: 0,               // desativa replay de sessão (custo)
    replaysOnErrorSampleRate: 1.0,             // ativa replay só em erros
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Não envia dados do localhost acidentalmente
    beforeSend(event) {
      if (window.location.hostname === "localhost") return null;
      return event;
    },
  });
}

// Cada deploy troca o hash dos arquivos JS. Se o usuário estava com o app
// aberto quando um deploy novo saiu no Vercel, o navegador tenta buscar um
// chunk lazy (React.lazy) que já não existe mais no servidor — "Failed to
// fetch dynamically imported module". O Vite dispara esse evento nesse caso;
// um reload busca o index.html atual (com os hashes certos) e resolve
// sozinho. A guarda de sessionStorage evita loop de reload se o erro
// persistir por outro motivo.
window.addEventListener("vite:preloadError", () => {
  const key = "ponderum:reloaded-after-preload-error";
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
