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
| `npm run cf:dev` | Corre o Worker em `localhost:8787` (como em produção: `_redirects`, `_headers` e formulário) |
| `npm run deploy` | Build + `wrangler deploy` manual (normalmente é feito pelo Cloudflare a cada push) |
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

O site é um Worker com *static assets*: o `dist/` é servido diretamente pela CDN e só `/api/*` executa código
([`worker/index.ts`](worker/index.ts)). A configuração está em [`wrangler.jsonc`](wrangler.jsonc).

1. **Workers & Pages → `ssenergy` → Settings → Build** (Git ligado ao repositório):
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Build variables: `NODE_VERSION=22`, `PUBLIC_TURNSTILE_SITE_KEY=<chave pública>` (e opcional `PUBLIC_CF_ANALYTICS_TOKEN`)
2. **Settings → Variables and Secrets** (tipo *Secret*):

   | Nome | Valor |
   |---|---|
   | `SMTP_PASS` | password da caixa `geral@ssenergy.pt` |
   | `TURNSTILE_SECRET` | chave secreta do Turnstile |

   As restantes (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `CONTACT_TO`, `CONTACT_FROM_NAME`) estão em `wrangler.jsonc` → `vars`.
   Não as criar no painel como texto: o `wrangler deploy` substitui-as pelas do ficheiro.
3. **Turnstile** (painel → Turnstile → Add widget, modo *Managed*): hostnames `ssenergy.jrapp.workers.dev`, `ssenergy.pt` e `www.ssenergy.pt`.
4. **Testar o email em local**: copiar `.dev.vars.example` para `.dev.vars` (não vai para o Git), preencher `SMTP_PASS`,
   `npm run build && npm run cf:dev` e enviar o formulário em `http://localhost:8787/contactos/`.
   Se a Amen recusar o login vindo da Cloudflare, pedir-lhes que permitam SMTP autenticado a partir de IPs externos.
5. Depois do deploy: `node scripts/verificar-redirects.mjs https://ssenergy.jrapp.workers.dev` e um envio real do formulário.

## Migração para ssenergy.pt

1. **Cloudflare → Add a domain** `ssenergy.pt` (plano Free) e rever os registos DNS importados. Têm de existir:
   - `MX ssenergy.pt → mail-pt.securemail.pro` (prioridade 10)
   - `TXT ssenergy.pt → "v=spf1 include:spf.webapps.net ~all"`
   - quaisquer outros registos da Amen (webmail, autodiscover, DKIM…) — comparar com o painel da Amen
   - **apagar** o `A ssenergy.pt → 81.88.52.249` e o `www` antigos (são o WordPress)
   - **não** ativar o Email Routing (desviaria o email da Amen)
2. **Amen → domínio → Nameservers**: trocar `ns1/ns2.amenworld.com` pelos dois nameservers indicados pela Cloudflare
   (desativar DNSSEC antes, se estiver ativo). A propagação pode demorar algumas horas.
3. **Worker `ssenergy` → Settings → Domains & Routes → Add → Custom domain**: `ssenergy.pt` e `www.ssenergy.pt`
   (o certificado SSL é criado automaticamente).
4. **Redirecionar `www` → raiz**: Rules → Redirect Rules → *Redirect from WWW to root* (301, manter caminho e query).
5. Em `wrangler.jsonc`, mudar `"workers_dev": false` (o endereço `*.workers.dev` deixa de responder e não duplica o site no Google).
6. `node scripts/verificar-redirects.mjs https://ssenergy.pt` e um envio real do formulário.
7. Google Search Console: submeter `https://ssenergy.pt/sitemap-index.xml` e inspecionar a home e 2–3 projetos.
8. Validar dados estruturados em <https://search.google.com/test/rich-results>.
9. Atualizar o link do site no Google Business Profile, Facebook e Instagram.
10. Acompanhar erros 404 no Search Console durante 4 semanas e acrescentar redirects se necessário.

## Pendente (dados da empresa)

- `src/data/site.json`: **morada** (e **email** público, se for `geral@ssenergy.pt`) (usados no schema LocalBusiness e no rodapé).
- `src/content/paginas/politica-de-privacidade.md`: validar juridicamente (NIF, morada, responsável).
- Projetos de carregadores VE: indicar a **localidade/distrito** (o WordPress não tinha esta informação).
- Projeto “Aveleda”: confirmar o concelho/distrito.
- DNS (Amen): acrescentar um registo DMARC, ex.: `_dmarc.ssenergy.pt TXT "v=DMARC1; p=none; rua=mailto:geral@ssenergy.pt"`.
