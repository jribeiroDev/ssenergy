// Cloudflare Pages Function — POST /api/contacto/
// Valida o pedido de orçamento, verifica o Turnstile e envia email via Resend.
// Variáveis (painel Cloudflare → Settings → Variables and Secrets, ou .dev.vars em local):
//   TURNSTILE_SECRET, RESEND_API_KEY, CONTACT_TO, CONTACT_FROM, ALLOW_NO_CAPTCHA (só dev)

interface Env {
  TURNSTILE_SECRET?: string;
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
  ALLOW_NO_CAPTCHA?: string;
}

interface Ctx {
  request: Request;
  env: Env;
}

const SERVICOS: Record<string, string> = {
  'paineis-solares': 'Painéis solares',
  'baterias-solares': 'Baterias solares',
  'carregadores-carros-eletricos': 'Carregador para carro elétrico',
  'instalacoes-eletricas': 'Instalação / manutenção elétrica',
  domotica: 'Domótica',
  iluminacao: 'Iluminação',
  'portoes-automaticos': 'Portões automáticos',
  outro: 'Outro',
};

const CAMPOS_EXTRA: [string, string][] = [
  ['fatura', 'Fatura mensal'],
  ['edificio', 'Tipo de edifício'],
  ['telhado', 'Tipo de telhado'],
  ['rede', 'Instalação elétrica'],
  ['bateria', 'Pretende bateria'],
  ['localCarregamento', 'Local de carregamento'],
  ['redeVe', 'Instalação elétrica'],
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function responder(request: Request, ok: boolean, erro?: string, status = ok ? 200 : 400) {
  const querJson = request.headers.get('Accept')?.includes('application/json');
  if (querJson) {
    return new Response(JSON.stringify(ok ? { ok } : { ok, erro }), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  // Envio sem JavaScript: redireciona para a página de agradecimento ou volta ao formulário.
  const destino = ok ? '/obrigado/' : `/contactos/?erro=${encodeURIComponent(erro ?? '')}#orcamento`;
  return Response.redirect(new URL(destino, request.url).href, 303);
}

async function verificarTurnstile(token: string, secret: string, ip: string | null) {
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return responder(request, false, 'Pedido inválido.');
  }
  const campo = (k: string, max = 500) => String(form.get(k) ?? '').trim().slice(0, max);

  // Honeypot: bots preenchem o campo escondido → fingimos sucesso.
  if (campo('website')) return responder(request, true);

  const dados = {
    servico: campo('servico', 60),
    nome: campo('nome', 120),
    email: campo('email', 160),
    telefone: campo('telefone', 30),
    localidade: campo('localidade', 120),
    mensagem: campo('mensagem', 3000),
  };

  if (!dados.nome || !dados.telefone || !dados.localidade || !SERVICOS[dados.servico]) {
    return responder(request, false, 'Preencha todos os campos obrigatórios.');
  }
  if (!EMAIL_RE.test(dados.email)) return responder(request, false, 'Indique um email válido.');
  if (campo('consentimento') !== 'sim') return responder(request, false, 'É necessário aceitar a política de privacidade.');

  if (env.TURNSTILE_SECRET) {
    const token = campo('cf-turnstile-response', 4096);
    const ok = token && (await verificarTurnstile(token, env.TURNSTILE_SECRET, request.headers.get('CF-Connecting-IP')));
    if (!ok) return responder(request, false, 'A verificação anti-spam falhou.', 403);
  } else if (env.ALLOW_NO_CAPTCHA !== 'true') {
    return responder(request, false, 'Formulário temporariamente indisponível.', 503);
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
    console.error('contacto: faltam RESEND_API_KEY / CONTACT_TO / CONTACT_FROM');
    return responder(request, false, 'Formulário temporariamente indisponível.', 503);
  }

  const extras = CAMPOS_EXTRA.map(([k, label]) => [label, campo(k, 120)] as const).filter(([, v]) => v);
  const linhas: [string, string][] = [
    ['Serviço', SERVICOS[dados.servico]],
    ['Nome', dados.nome],
    ['Email', dados.email],
    ['Telefone', dados.telefone],
    ['Localidade', dados.localidade],
    ...extras,
    ['Mensagem', dados.mensagem || '—'],
    ['Página', request.headers.get('Referer') ?? '—'],
  ];

  const html = `<h2>Novo pedido de orçamento</h2><table cellpadding="6" style="border-collapse:collapse">${linhas
    .map(([k, v]) => `<tr><th align="left" style="border-bottom:1px solid #eee">${escapar(k)}</th><td style="border-bottom:1px solid #eee">${escapar(v).replace(/\n/g, '<br>')}</td></tr>`)
    .join('')}</table>`;
  const text = linhas.map(([k, v]) => `${k}: ${v}`).join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: env.CONTACT_TO.split(',').map((s) => s.trim()),
      reply_to: dados.email,
      subject: `Pedido de orçamento: ${SERVICOS[dados.servico]} — ${dados.nome} (${dados.localidade})`,
      html,
      text,
    }),
  });

  if (!res.ok) {
    console.error('contacto: erro Resend', res.status, await res.text());
    return responder(request, false, 'Não foi possível enviar o pedido.', 502);
  }
  return responder(request, true);
}
