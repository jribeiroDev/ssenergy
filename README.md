# SS Energy — site

Site estático da [SS Energy](https://ssenergy.pt) feito com **Astro** e **Tailwind CSS v4**, alojado no **Cloudflare Pages**.

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
| `npm run cf:dev` | Serve o `dist/` com Wrangler: `_redirects`, `_headers` e a Function do formulário |
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
functions/api/contacto.ts   Function do formulário (Turnstile + envio por SMTP)
  _lib/smtp.ts              Cliente SMTP (sockets TCP do Cloudflare, sem dependências)
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

## Deploy no Cloudflare Pages

1. **Workers & Pages → Create → Pages → Connect to Git** e escolher o repositório.
2. Build command `npm run build`, output `dist`, variável `NODE_VERSION=22`.
3. **Variáveis e segredos** (Settings → Variables and Secrets):

   | Nome | Tipo | Valor |
   |---|---|---|
   | `PUBLIC_TURNSTILE_SITE_KEY` | build | chave pública do Turnstile |
   | `PUBLIC_CF_ANALYTICS_TOKEN` | build (opcional) | token do Web Analytics |
   | `TURNSTILE_SECRET` | secret | chave secreta do Turnstile |
   | `SMTP_HOST` | texto | `smtp-pt.securemail.pro` (email da Amen) |
   | `SMTP_PORT` | texto | `465` (SSL/TLS) ou `587` (STARTTLS) |
   | `SMTP_USER` | texto | caixa que envia, ex.: `geral@ssenergy.pt` (é também o remetente) |
   | `SMTP_PASS` | secret | password dessa caixa |
   | `CONTACT_TO` | texto (opcional) | quem recebe os pedidos; por defeito `geral@ssenergy.pt` (vários separados por vírgula) |
   | `CONTACT_FROM_NAME` | texto (opcional) | nome do remetente; por defeito `Site SS Energy` |

4. **Turnstile**: criar um widget para `ssenergy.pt` (modo *managed*).
5. **Email**: em local, copiar `.dev.vars.example` para `.dev.vars` (não vai para o Git), preencher `SMTP_PASS` e testar com `npm run cf:dev`.
   Se a Amen bloquear o login vindo da Cloudflare, pedir-lhes para permitir SMTP autenticado a partir de IPs externos.
6. Testar em `*.pages.dev`, correr `node scripts/verificar-redirects.mjs https://<projeto>.pages.dev`.

## Go-live

1. Apontar o domínio `ssenergy.pt` (e `www`) para o projeto Pages (Custom domains).
2. `node scripts/verificar-redirects.mjs https://ssenergy.pt`
3. Google Search Console: submeter `https://ssenergy.pt/sitemap-index.xml` e inspecionar a home e 2–3 projetos.
4. Validar dados estruturados em <https://search.google.com/test/rich-results>.
5. Atualizar o link do site no Google Business Profile, Facebook e Instagram.
6. Acompanhar erros 404 no Search Console durante 4 semanas e acrescentar redirects se necessário.

## Pendente (dados da empresa)

- `src/data/site.json`: **morada** (e **email** público, se for `geral@ssenergy.pt`) (usados no schema LocalBusiness e no rodapé).
- `src/content/paginas/politica-de-privacidade.md`: validar juridicamente (NIF, morada, responsável).
- Projetos de carregadores VE: indicar a **localidade/distrito** (o WordPress não tinha esta informação).
- Projeto “Aveleda”: confirmar o concelho/distrito.
- DNS (Amen): acrescentar um registo DMARC, ex.: `_dmarc.ssenergy.pt TXT "v=DMARC1; p=none; rua=mailto:geral@ssenergy.pt"`.
- O domínio raiz `ssenergy.pt` no Cloudflare Pages exige mudar os nameservers da Amen para a Cloudflare (copiar MX/SPF; o email continua na Amen).
