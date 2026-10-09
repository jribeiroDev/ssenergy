// Worker do site. Imagens/CSS/JS (/_astro/*) são servidos diretamente como assets estáticos;
// as páginas e /api/* passam primeiro por aqui (ver "run_worker_first" em wrangler.jsonc) para:
//   - www.ssenergy.pt e http:// → 301 para https://ssenergy.pt (domínio canónico)
//   - *.workers.dev → noindex (endereço técnico, não deve aparecer no Google)
//   - POST /api/contacto → formulário
import { contacto, type Env } from "./contacto";

interface WorkerEnv extends Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const DOMINIO = "ssenergy.pt";

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    // Domínio canónico (só atua em ssenergy.pt; workers.dev e localhost ficam como estão)
    if (url.hostname === `www.${DOMINIO}` || (url.hostname === DOMINIO && url.protocol === "http:")) {
      url.hostname = DOMINIO;
      url.protocol = "https:";
      return Response.redirect(url.href, 301);
    }

    let resposta: Response;
    if (url.pathname === "/api/contacto" || url.pathname === "/api/contacto/") {
      resposta =
        request.method === "POST"
          ? await contacto(request, env)
          : new Response("Método não permitido", { status: 405, headers: { Allow: "POST" } });
    } else if (url.pathname.startsWith("/api/")) {
      resposta = new Response("Não encontrado", { status: 404 });
    } else {
      resposta = await env.ASSETS.fetch(request);
    }

    if (url.hostname.endsWith(".workers.dev")) {
      resposta = new Response(resposta.body, resposta);
      resposta.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return resposta;
  },
};
