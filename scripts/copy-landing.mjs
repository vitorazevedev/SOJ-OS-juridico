import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, "dist");

mkdirSync(dist, { recursive: true });

// Landing estática vira a raiz do domínio; a SPA já foi buildada em dist/app pelo vite.
cpSync(path.join(root, "landing"), dist, { recursive: true });

// public/ (favicons, ícones) precisa existir na raiz do domínio também, porque
// componentes da SPA referenciam esses arquivos com path absoluto (ex: /ponderum-icon-white.png),
// que o browser sempre resolve a partir da raiz do domínio, independente da rota atual.
cpSync(path.join(root, "public"), dist, { recursive: true });

console.log("Landing + public copiados para dist/");
