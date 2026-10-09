// Cliente SMTP mínimo para Cloudflare Workers/Pages (sockets TCP), sem dependências.
// Suporta TLS implícito (porta 465), STARTTLS (587) e AUTH PLAIN/LOGIN.
import { connect } from "cloudflare:sockets";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

export interface Mensagem {
  from: { nome: string; email: string };
  to: string[];
  replyTo?: string;
  assunto: string;
  texto: string;
  html: string;
}

const CRLF = "\r\n";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64(s: string) {
  const bytes = encoder.encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// Corpo em base64 com linhas de 76 caracteres (RFC 2045)
const base64Linhas = (s: string) => base64(s).replace(/.{76}(?=.)/g, `$&${CRLF}`);

// Cabeçalhos com acentos (RFC 2047)
const cabecalho = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${base64(s)}?=`);

const semQuebras = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export function construirMensagem(m: Mensagem, dominio: string) {
  const fronteira = `ssenergy-${crypto.randomUUID()}`;
  const cabecalhos = [
    `From: ${cabecalho(semQuebras(m.from.nome))} <${m.from.email}>`,
    `To: ${m.to.join(", ")}`,
    ...(m.replyTo ? [`Reply-To: ${semQuebras(m.replyTo)}`] : []),
    `Subject: ${cabecalho(semQuebras(m.assunto))}`,
    `Date: ${new Date().toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: <${crypto.randomUUID()}@${dominio}>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${fronteira}"`,
  ];
  const parte = (tipo: string, conteudo: string) =>
    [
      `--${fronteira}`,
      `Content-Type: ${tipo}; charset=UTF-8`,
      "Content-Transfer-Encoding: base64",
      "",
      base64Linhas(conteudo),
    ].join(CRLF);

  return [
    ...cabecalhos,
    "",
    parte("text/plain", m.texto),
    parte("text/html", m.html),
    `--${fronteira}--`,
    "",
  ].join(CRLF);
}

class Ligacao {
  private buffer = "";
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private writer: WritableStreamDefaultWriter<Uint8Array>;

  constructor(private socket: ReturnType<typeof connect>) {
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
  }

  // Lê uma resposta completa (pode ter várias linhas "250-...") e valida o código
  async ler(esperado: number[]) {
    const linhas: string[] = [];
    for (;;) {
      let fim = this.buffer.indexOf(CRLF);
      while (fim === -1) {
        const { value, done } = await this.reader.read();
        if (done) throw new Error("SMTP: ligação fechada pelo servidor");
        this.buffer += decoder.decode(value, { stream: true });
        fim = this.buffer.indexOf(CRLF);
      }
      const linha = this.buffer.slice(0, fim);
      this.buffer = this.buffer.slice(fim + 2);
      linhas.push(linha);
      if (linha[3] !== "-") break;
    }
    const codigo = Number(linhas[0].slice(0, 3));
    if (!esperado.includes(codigo)) throw new Error(`SMTP: resposta inesperada "${linhas.join(" | ")}"`);
    return linhas;
  }

  async escrever(s: string) {
    await this.writer.write(encoder.encode(s));
  }

  async comando(cmd: string, esperado: number[]) {
    await this.escrever(cmd + CRLF);
    return this.ler(esperado);
  }

  libertar() {
    this.reader.releaseLock();
    this.writer.releaseLock();
  }
}

export async function enviarEmail(cfg: SmtpConfig, m: Mensagem, timeoutMs = 15000) {
  const dominio = m.from.email.split("@")[1];
  const modo = cfg.port === 465 ? "on" : cfg.port === 587 ? "starttls" : "off";
  let socket = connect({ hostname: cfg.host, port: cfg.port }, { secureTransport: modo, allowHalfOpen: false });

  const envio = (async () => {
    let c = new Ligacao(socket);
    await c.ler([220]);
    let ehlo = await c.comando(`EHLO ${dominio}`, [250]);

    if (modo === "starttls") {
      await c.comando("STARTTLS", [220]);
      c.libertar();
      socket = socket.startTls();
      c = new Ligacao(socket);
      ehlo = await c.comando(`EHLO ${dominio}`, [250]);
    }

    const auth = ehlo.find((l) => /^250[ -]AUTH /i.test(l)) ?? "";
    if (/\bPLAIN\b/i.test(auth)) {
      await c.comando(`AUTH PLAIN ${base64(`\0${cfg.user}\0${cfg.pass}`)}`, [235]);
    } else {
      await c.comando("AUTH LOGIN", [334]);
      await c.comando(base64(cfg.user), [334]);
      await c.comando(base64(cfg.pass), [235]);
    }

    await c.comando(`MAIL FROM:<${m.from.email}>`, [250]);
    for (const to of m.to) await c.comando(`RCPT TO:<${to}>`, [250, 251]);
    await c.comando("DATA", [354]);
    // Dot-stuffing: linhas começadas por "." levam um ponto extra
    const corpo = construirMensagem(m, dominio).replace(/^\./gm, "..");
    await c.escrever(`${corpo}${CRLF}.${CRLF}`);
    await c.ler([250]);
    await c.comando("QUIT", [221]).catch(() => {});
  })();

  const limite = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error(`SMTP: sem resposta em ${timeoutMs / 1000}s`)), timeoutMs),
  );

  try {
    await Promise.race([envio, limite]);
  } finally {
    socket.close().catch(() => {});
  }
}
