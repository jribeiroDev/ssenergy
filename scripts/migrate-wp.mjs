// Migração única do WordPress (ssenergy.pt) para content collections Astro.
// Uso: npm run migrate:wp   (precisa de rede; reescreve src/content/projetos e src/assets/projetos)
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'node-html-parser';
import sharp from 'sharp';

const WP = 'https://ssenergy.pt/wp-json/wp/v2';
const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src/content/projetos');
const ASSETS_DIR = path.join(ROOT, 'src/assets/projetos');
const SITE_ASSETS_DIR = path.join(ROOT, 'src/assets/site');
const MAX_WIDTH = 1920;

// Categorias WP: 18 = painéis solares, 19 = carregadores VE. Projetos antigos sem categoria são todos fotovoltaicos.
const CATEGORIAS = { 18: 'paineis-solares', 19: 'carregadores-ve' };

// Concelho e distrito de cada obra (o WP só tinha o nome da localidade no título).
const LOCAIS = {
  'vila-nova-de-gaia': ['Vila Nova de Gaia', 'Vila Nova de Gaia', 'Porto'],
  'braga-3': ['Braga', 'Braga', 'Braga'],
  'braga-2': ['Braga', 'Braga', 'Braga'],
  braga: ['Braga', 'Braga', 'Braga'],
  'paredes-2': ['Paredes', 'Paredes', 'Porto'],
  paredes: ['Paredes', 'Paredes', 'Porto'],
  'pacos-de-ferreira': ['Paços de Ferreira', 'Paços de Ferreira', 'Porto'],
  bunheiro: ['Bunheiro', 'Murtosa', 'Aveiro'],
  penafiel: ['Penafiel', 'Penafiel', 'Porto'],
  argoncilhe: ['Argoncilhe', 'Santa Maria da Feira', 'Aveiro'],
  'ilhavo-2': ['Ílhavo', 'Ílhavo', 'Aveiro'],
  ilhavo: ['Ílhavo', 'Ílhavo', 'Aveiro'],
  'baguim-do-monte': ['Baguim do Monte', 'Gondomar', 'Porto'],
  aveleda: ['Aveleda', undefined, undefined],
  'nogueira-regedoura': ['Nogueira da Regedoura', 'Santa Maria da Feira', 'Aveiro'],
  'madalena-v-n-gaia': ['Madalena', 'Vila Nova de Gaia', 'Porto'],
  'oliveira-de-frades-viseu': ['Oliveira de Frades', 'Oliveira de Frades', 'Viseu'],
  'figueira-castelo-rodrigo': ['Figueira de Castelo Rodrigo', 'Figueira de Castelo Rodrigo', 'Guarda'],
  aveiro: ['Aveiro', 'Aveiro', 'Aveiro'],
  'arrifana-sta-maria-da-feira': ['Arrifana', 'Santa Maria da Feira', 'Aveiro'],
  matosinhos: ['Matosinhos', 'Matosinhos', 'Porto'],
  'senhora-da-hora-matosinhos': ['Senhora da Hora', 'Matosinhos', 'Porto'],
  's-tome-do-castelo-vila-real': ['São Tomé do Castelo', 'Vila Real', 'Vila Real'],
  'santa-maria-da-feira': ['Santa Maria da Feira', 'Santa Maria da Feira', 'Aveiro'],
  'frades-povoa-de-lanhoso': ['Frades', 'Póvoa de Lanhoso', 'Braga'],
  guimaraes: ['Guimarães', 'Guimarães', 'Braga'],
  barcelos: ['Barcelos', 'Barcelos', 'Braga'],
  'fornos-sta-maria-da-feira': ['Fornos', 'Santa Maria da Feira', 'Aveiro'],
  amarante: ['Amarante', 'Amarante', 'Porto'],
  'celeiros-braga': ['Celeirós', 'Braga', 'Braga'],
  lagoa_trofa: ['Lagoa', 'Trofa', 'Porto'],
  'lamacaes-braga': ['Lamaçães', 'Braga', 'Braga'],
  'sao-victor-braga': ['São Victor', 'Braga', 'Braga'],
};

// Imagens globais do site (hero, "porquê escolher", serviços, logótipo).
const SITE_IMAGES = {
  'hero.jpg': 'https://ssenergy.pt/wp-content/uploads/2024/08/WhatsApp-Image-2024-07-31-at-15.58.43.jpeg',
  'equipa.jpg': 'https://ssenergy.pt/wp-content/uploads/2024/07/Equipa.jpeg',
  'produtos.jpg': 'https://ssenergy.pt/wp-content/uploads/2024/07/produtos.jpeg',
  'orcamento.jpg': 'https://ssenergy.pt/wp-content/uploads/2024/07/orcamento.jpeg',
  'solucoes.jpg': 'https://ssenergy.pt/wp-content/uploads/2024/07/solucoes.jpeg',
  'pos-venda.jpg': 'https://ssenergy.pt/wp-content/uploads/2024/07/servico-pos-venda.jpeg',
  'servico-paineis.jpg': 'https://ssenergy.pt/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-11-at-23.21.58.jpeg',
  'servico-carregadores.jpg': 'https://ssenergy.pt/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-11-at-23.21.59.jpeg',
  'servico-instalacoes.jpg': 'https://ssenergy.pt/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-11-at-23.21.59-1.jpeg',
  'logo.png': 'https://ssenergy.pt/wp-content/uploads/2024/03/logo_V2.png',
};

const decode = (s) =>
  parse(`<p>${s}</p>`).text.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const yamlStr = (s) => JSON.stringify(s);

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function saveImage(url, dest) {
  if (await fs.stat(dest).catch(() => null)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (dest.endsWith('.png')) {
    await fs.writeFile(dest, buf);
    return;
  }
  await sharp(buf)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(dest);
}

// "3.3 kW" / "3,64kW" → "3,3 kWp"; carregadores → "7,2 kW"
function extrairPotencia(texto, categoria) {
  const m = texto.match(/instalada de (\d+(?:[.,]\d+)?)\s*kw/i) ?? texto.match(/(\d+(?:[.,]\d+)?)\s*kw/i);
  if (!m) return undefined;
  const valor = m[1].replace('.', ',');
  return categoria === 'paineis-solares' ? `${valor} kWp` : `${valor} kW`;
}

function tituloProjeto(wpTitle, categoria, potencia, local) {
  if (categoria === 'carregadores-ve') {
    return potencia ? `Instalação de carregador VE de ${potencia}` : 'Instalação de carregador VE';
  }
  const onde = !local ? wpTitle : local[1] && local[1] !== local[0] ? `${local[0]} (${local[1]})` : local[0];
  return `Painéis solares em ${onde}${potencia ? ` – ${potencia}` : ''}`;
}

async function migrarProjetos() {
  await fs.mkdir(CONTENT_DIR, { recursive: true });
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  const projetos = await getJson(`${WP}/project?per_page=100&_embed`);
  const relatorio = [];

  for (const p of projetos) {
    const slug = p.slug.replace(/_/g, '-');
    const root = parse(p.content.rendered);
    const categoria = CATEGORIAS[p.project_category?.[0]] ?? 'paineis-solares';

    // Texto: 1.º parágrafo = descrição, <li> = equipamentos/características.
    const blocos = root.querySelectorAll('.et_pb_text_inner');
    const paragrafos = blocos
      .flatMap((b) => b.querySelectorAll('p'))
      .map((n) => decode(n.innerHTML))
      .filter((t) => t && !/be the energy|peça o seu orçamento/i.test(t));
    const itens = blocos.flatMap((b) => b.querySelectorAll('li')).map((n) => decode(n.innerHTML));

    // Fallback para conteúdo em shortcodes Divi não renderizados.
    const yoastDesc = p.yoast_head_json?.description ?? '';
    const descricao = paragrafos[0] ?? (yoastDesc.match(/^(.*?[^\d]\.)(\s|$)/)?.[1] ?? yoastDesc);

    // Imagens: links da galeria (tamanho original) ou imagem destacada.
    let urls = [...new Set(root.querySelectorAll('.et_pb_gallery_item a').map((a) => a.getAttribute('href')))];
    if (!urls.length) {
      const ids = [...p.content.rendered.matchAll(/gallery_ids=(?:&#\d+;|["”])(\d+(?:,\d+)*)/g)].flatMap((m) => m[1].split(','));
      for (const id of new Set(ids)) urls.push((await getJson(`${WP}/media/${id}`)).source_url);
    }
    const featured = p._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    if (!urls.length && featured) urls = [featured];

    const imagens = [];
    for (const [i, url] of urls.entries()) {
      const file = `${slug}-${String(i + 1).padStart(2, '0')}.jpg`;
      await saveImage(url, path.join(ASSETS_DIR, file));
      imagens.push(`../../assets/projetos/${file}`);
    }

    const potencia = extrairPotencia(`${descricao} ${yoastDesc} ${itens.join(' ')}`, categoria);
    const local = LOCAIS[p.slug];
    const titulo = tituloProjeto(decode(p.title.rendered), categoria, potencia, local);
    const legenda = local?.[0] ?? (categoria === 'carregadores-ve' ? 'Carregador VE' : decode(p.title.rendered));

    const fm = [
      '---',
      `titulo: ${yamlStr(titulo)}`,
      `data: ${p.date.slice(0, 10)}`,
      `categoria: ${categoria}`,
      local?.[0] ? `localidade: ${yamlStr(local[0])}` : null,
      local?.[1] ? `concelho: ${yamlStr(local[1])}` : null,
      local?.[2] ? `distrito: ${yamlStr(local[2])}` : null,
      potencia ? `potencia: ${yamlStr(potencia)}` : null,
      itens.length ? 'equipamentos:' : null,
      ...itens.map((t) => `  - ${yamlStr(t)}`),
      `capa: ${imagens[0]}`,
      `capaAlt: ${yamlStr(`${titulo} – SS Energy`)}`,
      imagens.length > 1 ? 'galeria:' : null,
      ...imagens.slice(1).map((src, i) => `  - imagem: ${src}\n    alt: ${yamlStr(`${legenda} – fotografia ${i + 2} da instalação`)}`),
      `destaque: false`,
      '---',
      '',
      descricao,
      '',
    ].filter((l) => l !== null);

    await fs.writeFile(path.join(CONTENT_DIR, `${slug}.md`), fm.join('\n'));
    relatorio.push({ wp: p.slug, slug, titulo, imagens: imagens.length, localidade: local?.[0] ?? '—' });
  }
  console.table(relatorio);
  return relatorio;
}

async function migrarImagensSite() {
  await fs.mkdir(SITE_ASSETS_DIR, { recursive: true });
  for (const [file, url] of Object.entries(SITE_IMAGES)) {
    await saveImage(url, path.join(SITE_ASSETS_DIR, file));
  }
  console.log(`Imagens do site: ${Object.keys(SITE_IMAGES).length}`);
}

await migrarImagensSite();
const r = await migrarProjetos();
console.log(`Projetos migrados: ${r.length}`);
