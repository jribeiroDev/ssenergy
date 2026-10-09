import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const CATEGORIAS = ['paineis-solares', 'carregadores-ve', 'instalacoes-eletricas', 'baterias'] as const;

const seo = z
  .object({
    titulo: z.string().max(70).optional(),
    descricao: z.string().max(170).optional(),
  })
  .optional();

const projetos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projetos' }),
  schema: ({ image }) =>
    z.object({
      titulo: z.string(),
      data: z.coerce.date(),
      categoria: z.enum(CATEGORIAS),
      localidade: z.string().optional(),
      concelho: z.string().optional(),
      distrito: z.string().optional(),
      potencia: z.string().optional(),
      equipamentos: z.array(z.string()).default([]),
      capa: image(),
      capaAlt: z.string(),
      galeria: z.array(z.object({ imagem: image(), alt: z.string() })).default([]),
      destaque: z.boolean().default(false),
      seo,
    }),
});

const servicos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/servicos' }),
  schema: ({ image }) =>
    z.object({
      titulo: z.string(),
      tituloCurto: z.string(),
      ordem: z.number().default(99),
      icone: z.enum(['sol', 'carregador', 'raio', 'bateria', 'casa', 'lampada', 'portao']),
      resumo: z.string(),
      imagem: image().optional(),
      imagemAlt: z.string().optional(),
      categoriaProjetos: z.enum(CATEGORIAS).optional(),
      destaqueInicio: z.boolean().default(false),
      beneficios: z.array(z.object({ titulo: z.string(), texto: z.string() })).default([]),
      processo: z.array(z.object({ titulo: z.string(), texto: z.string() })).default([]),
      faq: z.array(z.object({ pergunta: z.string(), resposta: z.string() })).default([]),
      seo,
    }),
});

const zonas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/zonas' }),
  schema: z.object({
    nome: z.string(),
    distrito: z.string(),
    concelhos: z.array(z.string()).default([]),
    titulo: z.string(),
    resumo: z.string(),
    seo,
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      titulo: z.string(),
      data: z.coerce.date(),
      atualizado: z.coerce.date().optional(),
      resumo: z.string(),
      capa: image().optional(),
      capaAlt: z.string().optional(),
      autor: z.string().default('SS Energy'),
      etiquetas: z.array(z.string()).default([]),
      rascunho: z.boolean().default(false),
      seo,
    }),
});

const paginas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/paginas' }),
  schema: z.object({
    titulo: z.string(),
    subtitulo: z.string().optional(),
    mostrarFormulario: z.boolean().default(false),
    noindex: z.boolean().default(false),
    seo,
  }),
});

export const collections = { projetos, servicos, zonas, blog, paginas };
