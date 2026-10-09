// Construtores de dados estruturados (JSON-LD) schema.org
import { site, absoluteUrl } from './site';

export const ORG_ID = absoluteUrl('/#organizacao');
export const WEBSITE_ID = absoluteUrl('/#website');

export function negocioLocal() {
  const m = site.morada;
  return {
    '@type': 'Electrician',
    '@id': ORG_ID,
    name: site.nome,
    legalName: site.nomeLegal,
    description: site.descricao,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/logo.png'),
    image: absoluteUrl('/og-default.jpg'),
    telephone: site.telefone,
    ...(site.email && { email: site.email }),
    foundingDate: site.fundacao,
    priceRange: '€€',
    ...(m.localidade && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: m.rua,
        postalCode: m.codigoPostal,
        addressLocality: m.localidade,
        addressRegion: m.regiao,
        addressCountry: m.pais,
      },
    }),
    areaServed: site.areaServida.map((name) => ({ '@type': 'AdministrativeArea', name })),
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: site.horarioAbertura,
      closes: site.horarioFecho,
    },
    sameAs: Object.values(site.redes),
  };
}

export function website() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: absoluteUrl('/'),
    name: site.nome,
    inLanguage: 'pt-PT',
    publisher: { '@id': ORG_ID },
  };
}

export function faqPage(faq: { pergunta: string; resposta: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.pergunta,
      acceptedAnswer: { '@type': 'Answer', text: f.resposta },
    })),
  };
}

export function servico(s: { nome: string; descricao: string; url: string }) {
  return {
    '@type': 'Service',
    name: s.nome,
    description: s.descricao,
    url: absoluteUrl(s.url),
    provider: { '@id': ORG_ID },
    areaServed: site.areaServida.map((name) => ({ '@type': 'AdministrativeArea', name })),
  };
}

export function grafo(...nos: object[]) {
  return { '@context': 'https://schema.org', '@graph': nos };
}
