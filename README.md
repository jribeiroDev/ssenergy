# SS Energy — site

Site estático da [SS Energy](https://ssenergy.pt) feito com **Astro** e **Tailwind CSS v4**, alojado no **Cloudflare Workers** (static assets).

- Zero frameworks de UI e ~2 KB de JavaScript (prefetch, formulário e lightbox)
- Imagens otimizadas no build (AVIF/WebP, `srcset`), fontes Poppins servidas do próprio domínio
- SEO: sitemap, canonical, Open Graph, JSON-LD (`Electrician`, `Service`, `FAQPage`), páginas por serviço
- URLs do WordPress mantidos (`/sobre-nos/`, `/project/<slug>/`) + redirects 301 em [`public/_redirects`](public/_redirects)

## Comandos

| Comando | O que faz |
|---|---|
| `npm install` | Instala dependências (Node ≥ 22.19 recomendado para o Wrangler) |
| `npm run dev` | Servidor de desenvolvimento em `localhost:4321` |
| `npm run build` | Gera o site em `dist/` |
| `npm run preview` | Serve o `dist/` |
| `npm run cf:dev` | Build + Worker em `localhost:8787`, como em produção (`_redirects`, `_headers`, formulário) |
| `npm run deploy` | Build + publicação manual (normalmente é o Cloudflare que publica a cada push) |
| `npm run check` | Verificação de tipos |
| `node scripts/verificar-redirects.mjs [base]` | Confirma que todos os URLs antigos respondem 200/301 |
| `npm run migrate:wp` | (Uma vez) importa projetos e imagens do WordPress |

## Estrutura

```
src/
  content/            Conteúdo editável (Markdown) — projetos, servicos, paginas
  content.config.ts   Schemas (o build falha se o conteúdo for inválido)
  data/               site.json (contactos, horário, redes) e inicio.json (textos da home)
  assets/             Imagens (otimizadas no build)
  components/ layouts/ pages/ lib/
public/
  _headers _redirects robots.txt
worker/
  index.ts            Worker: /api/contacto; o resto é servido de dist/
  contacto.ts         Formulário (validação, Turnstile, email)
  smtp.ts             Cliente SMTP (sockets TCP do Cloudflare, sem dependências)
wrangler.jsonc        Configuração do Worker (assets, variáveis)
```

## Adicionar conteúdo

O conteúdo é Markdown no repositório. Cada push para `main` publica o site no Cloudflare (~1–2 min).
Corra `npm run build` antes do push: se um ficheiro tiver um campo em falta ou errado, o build falha e indica qual
(schemas em [`src/content.config.ts`](src/content.config.ts)).

### Novo projeto → `/project/<nome-do-ficheiro>/`

1. Copiar as fotografias para `src/assets/projetos/` (JPG até ~1920 px; nome sem espaços nem acentos, ex.: `braga-2026-01.jpg`).
2. Criar `src/content/projetos/<slug>.md` — o nome do ficheiro é o URL:

```md
---
titulo: "Painéis solares em Braga – 3,6 kWp"
data: 2026-10-15
categoria: paineis-solares          # paineis-solares | carregadores-ve | instalacoes-eletricas | baterias
localidade: "Lamaçães"
concelho: "Braga"
distrito: "Braga"
potencia: "3,6 kWp"
equipamentos:
  - "6 Painéis Aiko 605W"
  - "1 Inversor Growatt 3.6kW"
capa: ../../assets/projetos/braga-2026-01.jpg
capaAlt: "Painéis solares no telhado de uma moradia em Lamaçães, Braga"
galeria:                            # opcional
  - imagem: ../../assets/projetos/braga-2026-02.jpg
    alt: "Inversor Growatt instalado na garagem"
destaque: false                     # true = aparece primeiro na página inicial
---

A SS Energy concluiu em Lamaçães (Braga) mais uma instalação com potência de 3,6 kWp.
```

### Outros conteúdos

| O quê | Onde | URL |
|---|---|---|
| Serviços (texto, vantagens, processo, FAQ) | `src/content/servicos/*.md` | `/servicos/<ficheiro>/` |
| Páginas simples (Sobre nós, privacidade…) | `src/content/paginas/*.md` | `/<ficheiro>/` |
| Contactos, horário, redes sociais | `src/data/site.json` | todo o site |
| Textos da página inicial | `src/data/inicio.json` | `/` |

Boas práticas:
- Preencher sempre o **alt** das imagens e o **distrito** dos projetos.
- Títulos descritivos e únicos (local + potência), nada de "Instalação de carregador" repetido.
- Campo opcional `seo: { titulo, descricao }` em qualquer conteúdo para afinar o título/descrição no Google.

## Deploy (Cloudflare Workers)

O site é um Worker com *static assets* ([`wrangler.jsonc`](wrangler.jsonc)). Imagens, CSS, JS e fontes (`/_astro/*`) são
servidos diretamente pela CDN; as páginas e `/api/*` passam por [`worker/index.ts`](worker/index.ts), que:

- redireciona `www.ssenergy.pt` e `http://` para `https://ssenergy.pt` (301);
- acrescenta `noindex` no endereço técnico `*.workers.dev` (continua a funcionar para testes);
- trata o formulário (`POST /api/contacto`).

O `wrangler deploy` corre o `npm run build` sozinho (`build.command`) e o Node vem de `.node-version`. Tudo o que não é
secreto está versionado no repositório. **No painel só é preciso:**

1. **Worker `ssenergy` → Settings → Build**: *Build command* vazio, *Deploy command* `npx wrangler deploy`.
2. **Settings → Variables and Secrets** → tipo **Secret**:

   | Nome | Valor |
   |---|---|
   | `SMTP_PASS` | password da caixa `geral@ssenergy.pt` |
   | `TURNSTILE_SECRET` | chave secreta do Turnstile |

   As restantes (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `CONTACT_TO`, `CONTACT_FROM_NAME`) estão em `wrangler.jsonc` → `vars`.
   Não as criar no painel: o `wrangler deploy` substitui-as pelas do ficheiro.
3. **Turnstile** (uma vez): painel → Turnstile → *Add widget*, modo *Managed*, hostnames `ssenergy.pt`, `www.ssenergy.pt`
   e `ssenergy.jrapp.workers.dev`. A **chave pública** vai para `src/data/site.json` → `turnstileSiteKey`; a **secreta** para o secret acima.

Sem os dois secrets o formulário responde "temporariamente indisponível" (não envia sem anti-spam).

Testar o email em local: copiar `.dev.vars.example` para `.dev.vars` (não vai para o Git), preencher `SMTP_PASS`
e `ALLOW_NO_CAPTCHA=true`, `npm run cf:dev` e enviar o formulário em `http://localhost:8787/contactos/`.
Se a Amen recusar o login vindo da Cloudflare, pedir-lhes que permitam SMTP autenticado a partir de IPs externos.

## Migração para ssenergy.pt

O código já está preparado (domínio canónico, `www` → raiz, sitemap, canonical, HSTS). Só falta o DNS:

1. **Cloudflare → Add a domain** → `ssenergy.pt` (plano Free). Confirmar que ficam estes registos (são o email da Amen):

   | Tipo | Nome | Conteúdo |
   |---|---|---|
   | MX | `ssenergy.pt` | `mail-pt.securemail.pro` (prioridade 10) |
   | TXT | `ssenergy.pt` | `v=spf1 include:spf.webapps.net ~all` |
   | CNAME | `mail` | `mail-pt.securemail.pro` |
   | CNAME | `smtp` | `smtp-pt.securemail.pro` |
   | CNAME | `webmail` | `webmail-pt.setupdns.net` |
   | CNAME | `autoconfig` | `tb-pt.securemail.pro` |
   | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:geral@ssenergy.pt` (novo, recomendado) |

   Todos os registos de email em **DNS only** (nuvem cinzenta). **Apagar** `A ssenergy.pt → 81.88.52.249`, `www` e `ftp`
   (eram o WordPress). **Não** ativar o Email Routing.
2. **Amen → domínio → Nameservers**: trocar `ns1/ns2.amenworld.com` pelos dois indicados pela Cloudflare. Propagação: algumas horas.
3. **Worker `ssenergy` → Settings → Domains & Routes → Add → Custom domain**: `ssenergy.pt` e `www.ssenergy.pt`
   (SSL automático; o redirect `www` → raiz já é feito pelo Worker).
4. Verificar: `node scripts/verificar-redirects.mjs https://ssenergy.pt`, `curl -I http://www.ssenergy.pt` (301 → `https://ssenergy.pt/`)
   e um envio real do formulário.
5. Google Search Console: adicionar a propriedade, submeter `https://ssenergy.pt/sitemap-index.xml` e inspecionar a home e 2–3 projetos.
6. Validar dados estruturados em <https://search.google.com/test/rich-results>.
7. Atualizar o link do site no Google Business Profile, Facebook e Instagram.
8. Acompanhar erros 404 no Search Console durante 4 semanas e acrescentar redirects em `public/_redirects` se necessário.

## Pendente (dados da empresa)

- `src/content/paginas/politica-de-privacidade.md`: validar juridicamente (NIF, morada, responsável).
- Projetos de carregadores VE: indicar a **localidade/distrito** (o WordPress não tinha esta informação).
- Projeto “Aveleda”: confirmar o concelho/distrito.
