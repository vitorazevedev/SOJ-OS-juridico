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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
