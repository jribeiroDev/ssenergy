import { getCollection } from 'astro:content';

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
