// Worker do site: o HTML/CSS/imagens (dist/) são servidos diretamente como assets estáticos.
// Este código só corre para /api/* (ver "run_worker_first" em wrangler.jsonc).
import { contacto, type Env } from "./contacto";

interface WorkerEnv extends Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/contacto" || pathname === "/api/contacto/") {
      if (request.method !== "POST") {
        return new Response("Método não permitido", { status: 405, headers: { Allow: "POST" } });
      }
      return contacto(request, env);
    }

    if (pathname.startsWith("/api/")) {
      return new Response("Não encontrado", { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },
};
