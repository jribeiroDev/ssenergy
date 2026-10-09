import { getCollection, type CollectionEntry } from 'astro:content';

/** Artigos publicados (rascunhos só aparecem em `astro dev`). */
export async function artigosPublicados() {
  const todos = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.rascunho);
  return todos.sort((a, b) => b.data.data.valueOf() - a.data.data.valueOf());
}

/** Projetos do mais recente para o mais antigo; destaques primeiro se pedido. */
export async function projetosOrdenados(destaquesPrimeiro = false) {
  const todos = await getCollection('projetos');
  return todos.sort((a, b) => {
    if (destaquesPrimeiro && a.data.destaque !== b.data.destaque) return a.data.destaque ? -1 : 1;
    return b.data.data.valueOf() - a.data.data.valueOf() || a.id.localeCompare(b.id);
  });
}

export async function servicosOrdenados() {
  return (await getCollection('servicos')).sort((a, b) => a.data.ordem - b.data.ordem);
}

export const tituloSeo = (e: CollectionEntry<'servicos' | 'blog' | 'paginas' | 'projetos'>) =>
  e.data.seo?.titulo ?? e.data.titulo;
