// @ts-check
import fs from 'node:fs';
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Páginas fora do sitemap: utilitárias + páginas com noindex: true no frontmatter.
/** @param {string} dir @param {RegExp} re */
const comFrontmatter = (dir, re) =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && re.test(fs.readFileSync(`${dir}/${f}`, 'utf8').split('---')[1] ?? ''));
const paginasNoindex = comFrontmatter('./src/content/paginas', /^noindex:\s*true/m).map((f) => `/${f.slice(0, -3)}/`);
const EXCLUIR_SITEMAP = ['/obrigado/', ...paginasNoindex];

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
        variants: [
          { src: ['@fontsource/poppins/files/poppins-latin-400-normal.woff2'], weight: 400, style: 'normal' },
          { src: ['@fontsource/poppins/files/poppins-latin-600-normal.woff2'], weight: 600, style: 'normal' },
          { src: ['@fontsource/poppins/files/poppins-latin-700-normal.woff2'], weight: 700, style: 'normal' },
        ],
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
