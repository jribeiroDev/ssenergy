// @ts-check
import fs from 'node:fs';
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Páginas fora do sitemap: utilitárias + conteúdos marcados noindex/rascunho no CMS.
const comFrontmatter = (dir, re) =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && re.test(fs.readFileSync(`${dir}/${f}`, 'utf8').split('---')[1] ?? ''));
const paginasNoindex = comFrontmatter('./src/content/paginas', /^noindex:\s*true/m).map((f) => `/${f.slice(0, -3)}/`);
const totalArtigos = fs.readdirSync('./src/content/blog').filter((f) => f.endsWith('.md')).length;
const blogVazio = totalArtigos === comFrontmatter('./src/content/blog', /^rascunho:\s*true/m).length;
const EXCLUIR_SITEMAP = ['/obrigado/', ...paginasNoindex, ...(blogVazio ? ['/blog/'] : [])];

export default defineConfig({
  site: 'https://ssenergy.pt',
  // Mantém o formato de URLs do WordPress (/sobre-nos/, /project/braga/)
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        jpeg: { quality: 75, mozjpeg: true },
        webp: { quality: 72, effort: 5 },
        avif: { quality: 55 },
      },
    },
  },
  fonts: [
    {
      // Só o subconjunto latin (PT) dos pesos usados, servido do próprio domínio
      provider: fontProviders.local(),
      name: 'Poppins',
      cssVariable: '--font-poppins',
      fallbacks: ['sans-serif'],
      options: {
        variants: [400, 600, 700].map((weight) => ({
          src: [`@fontsource/poppins/files/poppins-latin-${weight}-normal.woff2`],
          weight,
          style: 'normal',
        })),
      },
    },
  ],
  integrations: [
    sitemap({
      filter: (page) => !EXCLUIR_SITEMAP.includes(new URL(page).pathname),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
