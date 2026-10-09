import site from '../data/site.json';
import inicio from '../data/inicio.json';
import type { CATEGORIAS } from '../content.config';

export { site, inicio };

export type Categoria = (typeof CATEGORIAS)[number];

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  'paineis-solares': 'Painéis solares',
  'carregadores-ve': 'Carregadores VE',
  'instalacoes-eletricas': 'Instalações elétricas',
  baterias: 'Baterias',
};

export const NAV = [
  { href: '/servicos/', label: 'Serviços' },
  { href: '/projetos/', label: 'Projetos' },
  { href: '/sobre-nos/', label: 'Sobre nós' },
  { href: '/blog/', label: 'Blog' },
  { href: '/contactos/', label: 'Contactos' },
];

export const whatsappUrl = (texto = site.whatsappMensagem) =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(texto)}`;

export const telUrl = `tel:${site.telefone}`;

export const absoluteUrl = (path: string) => new URL(path, 'https://ssenergy.pt').href;

export const formatarData = (d: Date) =>
  d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });

export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
