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

export const collections = { projetos, servicos, paginas };
