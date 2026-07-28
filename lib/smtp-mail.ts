import 'server-only';

import { randomUUID } from 'node:crypto';
import tls, { type TLSSocket } from 'node:tls';

const SMTP_TIMEOUT_MS = 20_000;

type SmtpResponse = {
  code: number;
  lines: string[];
};

type SendSmtpMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

class SmtpSession {
  private buffer = '';
  private lines: string[] = [];
  private waiters: Array<{
    resolve: (line: string) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(private readonly socket: TLSSocket) {
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => this.handleData(chunk));
    socket.on('error', (error) => this.rejectAll(error));
    socket.on('timeout', () => {
      this.rejectAll(new Error('SMTP connection timed out.'));
      socket.destroy();
    });
    socket.on('close', () => {
      this.rejectAll(new Error('SMTP connection closed unexpectedly.'));
    });
  }

  private handleData(chunk: string) {
    this.buffer += chunk;

    while (true) {
      const lineEnd = this.buffer.indexOf('\r\n');

      if (lineEnd < 0) break;

      const line = this.buffer.slice(0, lineEnd);
      this.buffer = this.buffer.slice(lineEnd + 2);

      const waiter = this.waiters.shift();

      if (waiter) {
        waiter.resolve(line);
      } else {
        this.lines.push(line);
      }
    }
  }

  private rejectAll(error: Error) {
    for (const waiter of this.waiters.splice(0)) {
      waiter.reject(error);
    }
  }

  private nextLine() {
    const existing = this.lines.shift();

    if (existing !== undefined) {
      return Promise.resolve(existing);
    }

    return new Promise<string>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  async readResponse(): Promise<SmtpResponse> {
    const lines: string[] = [];
    let responseCode = 0;

    while (true) {
      const line = await this.nextLine();
      lines.push(line);

      const match = line.match(/^(\d{3})([ -])/);

      if (!match) continue;

      responseCode = Number(match[1]);

      if (match[2] === ' ') break;
    }

    return {
      code: responseCode,
      lines,
    };
  }

  async command(command: string, allowedCodes: number[]) {
    this.socket.write(`${command}\r\n`);
    const response = await this.readResponse();

    if (!allowedCodes.includes(response.code)) {
      throw new Error(
        `SMTP command failed (${response.code}): ${response.lines.join(' ')}`,
      );
    }

    return response;
  }

  writeRaw(value: string) {
    this.socket.write(value);
  }

  end() {
    this.socket.end();
  }
}

function getRequiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;

  return value.trim().toLowerCase() === 'true';
}

function parsePort(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function encodeHeader(value: string) {
  if (/^[\x20-\x7E]*$/.test(value)) return value;

  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function wrapBase64(value: string) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .match(/.{1,76}/g)
    ?.join('\r\n') ?? '';
}

function escapeSmtpData(value: string) {
  return value
    .replace(/\r?\n/g, '\r\n')
    .replace(/^\./gm, '..');
}

function getFromAddress() {
  const configuredFrom = process.env.SMTP_FROM?.trim();
  const smtpUser = getRequiredEnvironmentValue('SMTP_USER');

  if (!configuredFrom) {
    return {
      header: `Sendio <${smtpUser}>`,
      envelope: smtpUser,
    };
  }

  const match = configuredFrom.match(/<([^<>]+)>\s*$/);
  const envelope = match?.[1]?.trim() || configuredFrom;

  return {
    header: configuredFrom,
    envelope,
  };
}

function buildMimeMessage(input: SendSmtpMailInput, fromHeader: string) {
  const boundary = `sendio-${randomUUID()}`;
  const headers = [
    `From: ${fromHeader}`,
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomUUID()}@sendio.be>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(input.text),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(input.html),
    `--${boundary}--`,
    '',
  ];

  return escapeSmtpData([...headers, '', ...body].join('\r\n'));
}

export async function sendSmtpMail(input: SendSmtpMailInput) {
  const host = getRequiredEnvironmentValue('SMTP_HOST');
  const port = parsePort(process.env.SMTP_PORT, 465);
  const secure = parseBoolean(process.env.SMTP_SECURE, true);
  const username = getRequiredEnvironmentValue('SMTP_USER');
  const password = getRequiredEnvironmentValue('SMTP_PASSWORD');
  const from = getFromAddress();

  if (!secure) {
    throw new Error('SMTP_SECURE must be true for the configured Sendio mailbox.');
  }

  const socket = tls.connect({
    host,
    port,
    servername: host,
    rejectUnauthorized: true,
  });
  socket.setTimeout(SMTP_TIMEOUT_MS);
  const session = new SmtpSession(socket);

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('SMTP secure connection timed out.'));
    }, SMTP_TIMEOUT_MS);

    socket.once('secureConnect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  try {
    const greeting = await session.readResponse();

    if (greeting.code !== 220) {
      throw new Error(`SMTP greeting failed: ${greeting.lines.join(' ')}`);
    }

    await session.command('EHLO sendio.be', [250]);
    await session.command('AUTH LOGIN', [334]);
    await session.command(Buffer.from(username).toString('base64'), [334]);
    await session.command(Buffer.from(password).toString('base64'), [235]);
    await session.command(`MAIL FROM:<${from.envelope}>`, [250]);
    await session.command(`RCPT TO:<${input.to}>`, [250, 251]);
    await session.command('DATA', [354]);

    const message = buildMimeMessage(input, from.header);
    session.writeRaw(`${message}\r\n.\r\n`);

    const dataResponse = await session.readResponse();

    if (dataResponse.code !== 250) {
      throw new Error(
        `SMTP message delivery failed (${dataResponse.code}): ${dataResponse.lines.join(' ')}`,
      );
    }

    await session.command('QUIT', [221]);
  } finally {
    session.end();
  }
}
