// Verifica que todos os URLs do site WordPress antigo respondem 200 (ou 301 → 200) no site novo.
// Uso: node scripts/verificar-redirects.mjs [base]   (por defeito http://127.0.0.1:8788 — `npm run cf:dev`)
// Usar antes e depois de mudar o DNS (ex.: node scripts/verificar-redirects.mjs https://ssenergy.pt)

const BASE = process.argv[2] ?? 'http://127.0.0.1:8788';

// URLs do WordPress (sitemap Yoast + projetos, que não estavam no sitemap antigo)
const ANTIGOS = [
  '/', '/sobre-nos/', '/projetos/', '/contactos/', '/paineis-solares/', '/carregadores-de-carros-eletricos/',
  '/promo/', '/politica-de-privacidade/', '/project_category/paineis-solares/', '/project_category/carregadores-ve/',
  '/feed/',
  ...[
    'vila-nova-de-gaia', 'instalacao-de-tomada-para-carregador-ve', 'braga-3', 'instalacao-de-carregador-v-eletrico-11',
    'paredes-2', 'instalacao-de-carregador-v-eletrico-10', 'pacos-de-ferreira', 'instalacao-de-carregador-v-eletrico-9',
    'bunheiro', 'instalacao-de-carregador-v-eletrico-8', 'paredes', 'instalacao-de-carregador-v-eletrico-7', 'penafiel',
    'instalacao-de-carregador-v-eletrico-6', 'instalacao-de-carregador-v-eletrico-5', 'instalacao-de-carregador-v-eletrico-4',
    'instalacao-de-carregador-v-eletrico-3', 'instalacao-de-carregador-v-eletrico-2', 'instalacao-de-carregador-v-eletrico',
    'braga-2', 'argoncilhe', 'ilhavo-2', 'baguim-do-monte', 'braga', 'ilhavo', 'aveleda', 'nogueira-regedoura',
    'madalena-v-n-gaia', 'oliveira-de-frades-viseu', 'figueira-castelo-rodrigo', 'aveiro', 'arrifana-sta-maria-da-feira',
    'matosinhos', 'senhora-da-hora-matosinhos', 's-tome-do-castelo-vila-real', 'santa-maria-da-feira',
    'frades-povoa-de-lanhoso', 'guimaraes', 'barcelos', 'fornos-sta-maria-da-feira', 'amarante', 'celeiros-braga',
    'lagoa_trofa', 'lamacaes-braga', 'sao-victor-braga', 'instalacao-de-tomada-para-carregador-ve-2',
  ].map((s) => `/project/${s}/`),
];

let falhas = 0;
for (const path of ANTIGOS) {
  const res = await fetch(new URL(path, BASE), { redirect: 'manual' });
  let estado = `${res.status}`;
  let ok = res.status === 200;
  if (res.status === 301 || res.status === 308) {
    const destino = new URL(res.headers.get('location'), BASE);
    const final = await fetch(destino);
    estado += ` → ${destino.pathname} ${final.status}`;
    ok = final.status === 200;
  }
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${path.padEnd(55)} ${estado}`);
}
console.log(falhas ? `\n${falhas} URL(s) com problemas.` : `\nTodos os ${ANTIGOS.length} URLs antigos estão OK.`);
process.exit(falhas ? 1 : 0);
