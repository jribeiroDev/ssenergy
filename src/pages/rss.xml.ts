import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { artigosPublicados } from '../lib/conteudo';
import { site } from '../lib/site';

export async function GET(context: APIContext) {
  const artigos = (await artigosPublicados()).filter((a) => !a.data.rascunho);
  return rss({
    title: `Blog ${site.nome}`,
    description: site.descricao,
    site: context.site!,
    trailingSlash: true,
    customData: '<language>pt-PT</language>',
    items: artigos.map((a) => ({
      title: a.data.titulo,
      description: a.data.resumo,
      pubDate: a.data.data,
      link: `/blog/${a.id}/`,
    })),
  });
}
