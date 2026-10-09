# SS Energy — site

Site estático da [SS Energy](https://ssenergy.pt) feito com **Astro**, **Tailwind CSS v4** e **Sveltia CMS**, alojado no **Cloudflare Pages**.

- Zero frameworks de UI e ~2 KB de JavaScript (prefetch, formulário e lightbox)
- Imagens otimizadas no build (AVIF/WebP, `srcset`), fontes Poppins servidas do próprio domínio
- SEO: sitemap, canonical, Open Graph, JSON-LD (`Electrician`, `Service`, `FAQPage`, `BreadcrumbList`, `BlogPosting`), páginas por serviço e por zona
- URLs do WordPress mantidos (`/sobre-nos/`, `/project/<slug>/`) + redirects 301 em [`public/_redirects`](public/_redirects)

## Comandos

| Comando | O que faz |
|---|---|
| `npm install` | Instala dependências (Node ≥ 22.19 recomendado para o Wrangler) |
| `npm run dev` | Servidor de desenvolvimento em `localhost:4321` (mostra rascunhos do blog) |
| `npm run build` | Gera o site em `dist/` |
| `npm run preview` | Serve o `dist/` |
| `npm run cf:dev` | Serve o `dist/` com Wrangler: `_redirects`, `_headers` e a Function do formulário |
| `npm run check` | Verificação de tipos |
| `node scripts/verificar-redirects.mjs [base]` | Confirma que todos os URLs antigos respondem 200/301 |
| `npm run migrate:wp` | (Uma vez) importa projetos e imagens do WordPress |

## Estrutura

```
src/
  content/            Conteúdo editável (Markdown) — projetos, servicos, zonas, blog, paginas
  content.config.ts   Schemas (o build falha se o conteúdo for inválido)
  data/               site.json (contactos, horário, redes) e inicio.json (textos da home)
  assets/             Imagens (otimizadas no build)
  components/ layouts/ pages/ lib/
public/
  admin/              Sveltia CMS (/admin/) e config.yml
  _headers _redirects robots.txt
functions/api/contacto.ts   Function do formulário (Turnstile + Resend)
```

## Gestão de conteúdos (CMS)

O painel fica em **`https://ssenergy.pt/admin/`**. Cada gravação faz um commit no GitHub e o Cloudflare publica o site em ~1–2 min.

Coleções: **Projetos**, **Blog**, **Serviços**, **Zonas**, **Páginas** e **Definições** (contactos e textos da página inicial).

Dicas para quem edita:
- Preencha sempre a **descrição da imagem (alt)** e o **distrito** dos projetos (liga-os automaticamente às páginas de zona).
- Artigos novos nascem como **rascunho** — desmarque para publicar.
- Os textos das zonas devem ser únicos (não copiar entre zonas).

### Configuração inicial do CMS (uma vez)

1. Criar o repositório no GitHub e fazer push deste projeto.
2. Em `public/admin/config.yml`, substituir `repo: OWNER/ssenergy` pelo repositório real.
3. Autenticação GitHub: publicar o Worker [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) no Cloudflare, criar uma *OAuth App* no GitHub com callback `https://<worker>/callback`, definir `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` e `ALLOWED_DOMAINS=ssenergy.pt` no Worker, e pôr o URL do Worker em `base_url`.
4. Adicionar quem edita como colaborador do repositório GitHub.

> Para testar sem OAuth: abrir `/admin/` em `npm run dev` num browser Chromium e escolher **Work with Local Repository**.

## Deploy no Cloudflare Pages

1. **Workers & Pages → Create → Pages → Connect to Git** e escolher o repositório.
2. Build command `npm run build`, output `dist`, variável `NODE_VERSION=22`.
3. **Variáveis e segredos** (Settings → Variables and Secrets):

   | Nome | Tipo | Valor |
   |---|---|---|
   | `PUBLIC_TURNSTILE_SITE_KEY` | build | chave pública do Turnstile |
   | `PUBLIC_CF_ANALYTICS_TOKEN` | build (opcional) | token do Web Analytics |
   | `TURNSTILE_SECRET` | secret | chave secreta do Turnstile |
   | `RESEND_API_KEY` | secret | chave da API Resend |
   | `CONTACT_TO` | texto | email(s) que recebem os pedidos (separados por vírgula) |
   | `CONTACT_FROM` | texto | ex.: `SS Energy <site@ssenergy.pt>` (domínio verificado no Resend) |

4. **Turnstile**: criar um widget para `ssenergy.pt` (modo *managed*).
5. **Resend**: adicionar o domínio `ssenergy.pt` e criar os registos DNS (SPF/DKIM) indicados.
6. Testar em `*.pages.dev`, correr `node scripts/verificar-redirects.mjs https://<projeto>.pages.dev`.

## Go-live

1. Apontar o domínio `ssenergy.pt` (e `www`) para o projeto Pages (Custom domains).
2. `node scripts/verificar-redirects.mjs https://ssenergy.pt`
3. Google Search Console: submeter `https://ssenergy.pt/sitemap-index.xml` e inspecionar a home e 2–3 projetos.
4. Validar dados estruturados em <https://search.google.com/test/rich-results>.
5. Atualizar o link do site no Google Business Profile, Facebook e Instagram.
6. Acompanhar erros 404 no Search Console durante 4 semanas e acrescentar redirects se necessário.

## Pendente (dados da empresa)

- `src/data/site.json`: **email** e **morada** (usados no schema LocalBusiness e no rodapé).
- `src/content/paginas/politica-de-privacidade.md`: validar juridicamente (NIF, morada, responsável).
- Projetos de carregadores VE: indicar a **localidade/distrito** (o WordPress não tinha esta informação).
- Projeto “Aveleda”: confirmar o concelho/distrito.
