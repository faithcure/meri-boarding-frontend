// @ts-nocheck
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RouteContext } from './context.js';

type AssetRouteRequest = FastifyRequest<{
  Params: { fileName?: string };
  Querystring: { w?: string; q?: string; original?: string };
}>;

function escapeHtml(input: string) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMailRows(rows: Array<{ label: string; value: string }>) {
  return rows
    .map(
      (row) => `<tr>
  <td style="padding:10px 12px;border:1px solid #e5e7eb;background:#ffffff;color:#6b4e27;font-weight:600;width:170px;font-family:Arial,sans-serif;font-size:13px;">${escapeHtml(row.label)}</td>
  <td style="padding:10px 12px;border:1px solid #e5e7eb;background:#ffffff;color:#2f2f2f;font-family:Arial,sans-serif;font-size:13px;line-height:1.45;">${escapeHtml(row.value || '-')}</td>
</tr>`,
    )
    .join('');
}

function formatMailDate(value: Date | string, locale: string) {
  const date = value instanceof Date ? value : new Date(value);
  const localeMap: Record<string, string> = {
    de: 'de-DE',
    tr: 'tr-TR',
    en: 'en-US',
  };
  const resolvedLocale = localeMap[String(locale || '').toLowerCase()] || 'en-US';
  return new Intl.DateTimeFormat(resolvedLocale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  }).format(date);
}

function renderBrandedMailHtml(options: {
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; value: string }>;
  message?: string;
  locale?: string;
  generatedAt?: Date;
}) {
  const now = formatMailDate(options.generatedAt || new Date(), options.locale || 'en');
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#ffffff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" cellspacing="0" cellpadding="0" style="max-width:680px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:22px 24px;background:#CAA05C;text-align:center;">
                <img src="cid:meri-logo" alt="Meri Boarding" width="292" style="display:block;margin:0 auto 10px;max-width:292px;height:auto;" />
                <div style="color:#ffffff;font-family:Arial,sans-serif;font-size:12px;margin-top:4px;">${escapeHtml(options.subtitle || 'Form Notification')}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 8px 24px;">
                <div style="font-family:Arial,sans-serif;color:#5a3f20;font-size:20px;font-weight:700;margin:0 0 10px 0;">${escapeHtml(options.title)}</div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border-radius:8px;overflow:hidden;">
                  ${renderMailRows(options.rows)}
                </table>
              </td>
            </tr>
            ${
              options.message
                ? `<tr>
              <td style="padding:8px 24px 18px 24px;">
                <div style="font-family:Arial,sans-serif;color:#5a3f20;font-size:13px;font-weight:700;margin-bottom:8px;">Message</div>
                <div style="border:1px solid #e5e7eb;background:#ffffff;border-radius:8px;padding:12px;color:#2f2f2f;font-family:Arial,sans-serif;font-size:13px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(options.message)}</div>
              </td>
            </tr>`
                : ''
            }
            <tr>
              <td style="padding:14px 24px 18px 24px;border-top:1px solid #e5e7eb;color:#7b6b55;font-family:Arial,sans-serif;font-size:11px;">
                Generated at ${escapeHtml(now)} • Meri Boarding Website
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

type MailAttachment = {
  filename: string;
  content: Buffer;
  cid?: string;
  contentType?: string;
};

let cachedLogoAttachment: MailAttachment | null | undefined;

async function getMailLogoAttachment(): Promise<MailAttachment | null> {
  if (cachedLogoAttachment !== undefined) {
    return cachedLogoAttachment;
  }

  const candidates = [
    'http://public-fe:3000/images/meri/meri-logo-black.png',
    'http://public-fe:3000/images/meri/meri-logo-mark-white.svg',
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const content = Buffer.from(await response.arrayBuffer());
      if (content.length < 64) continue;
      const contentType = String(response.headers.get('content-type') || '').trim();
      cachedLogoAttachment = {
        filename: url.endsWith('.svg') ? 'meri-logo.svg' : 'meri-logo.png',
        content,
        cid: 'meri-logo',
        contentType: contentType || (url.endsWith('.svg') ? 'image/svg+xml' : 'image/png'),
      };
      return cachedLogoAttachment;
    } catch {
      continue;
    }
  }

  cachedLogoAttachment = null;
  return null;
}

function getAutoReplyCopy(locale: string, type: 'contact' | 'request', boarding?: string) {
  if (type === 'request') {
    return {
      subject: `Your request has been received - ${boarding || 'Meri Boarding'}`,
      title: 'Your request has been received',
      body: 'Your message has been received. We will get back to you as soon as possible. Thank you.',
    };
  }
  return {
    subject: 'Your message has been received - Meri Boarding',
    title: 'Your message has been received',
    body: 'Your message has been received. We will get back to you as soon as possible. Thank you.',
  };
}

async function sendAutoReplyEmail(options: {
  sendSmtpMail: (options: {
    to: string[];
    subject: string;
    text: string;
    html?: string;
    replyTo?: string;
    attachments?: MailAttachment[];
  }) => Promise<{ sent: boolean; error?: string }>;
  locale: string;
  to: string;
  type: 'contact' | 'request';
  boarding?: string;
  logoAttachment?: MailAttachment | null;
}) {
  const copy = getAutoReplyCopy(options.locale, options.type, options.boarding);
  await options.sendSmtpMail({
    to: [options.to],
    subject: copy.subject,
    text: `${copy.title}\n\n${copy.body}`,
    html: renderBrandedMailHtml({
      title: copy.title,
      subtitle: 'Meri Boarding',
      rows: [{ label: 'Status', value: copy.body }],
      locale: options.locale,
      generatedAt: new Date(),
    }),
    attachments: options.logoAttachment ? [options.logoAttachment] : undefined,
  });
}

export async function registerPublicRoutes(ctx: RouteContext) {
  const {
    server,
    parseLocale,
    getHeaderContent,
    getGeneralSettingsContent,
    getHomeContent,
    getServicesContent,
    getAmenitiesContent,
    getReservationContent,
    getContactContent,
    ragRequestTimeoutMs,
    ragServiceUrl,
    getContactSubmissionsCollection,
    resolveContactNotificationRecipients,
  sendSmtpMail,
    getDb,
    normalizeHotelLocaleContent,
    escapeRegex,
    sanitizeFilename,
    parseRequestedDimension,
    assetWidthCeiling,
    supportsWebp,
    getOrCreateWebpVariant,
    extToMime,
    avatarUploadDir,
    hotelUploadDir,
    homeUploadDir,
    ObjectId,
  } = ctx;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const collapseWhitespace = (value: string) => String(value || '').replace(/\s+/g, ' ').trim();
const maxChatHistoryItems = 12;
const maxChatHistoryTextLen = 600;
const isMeaningfulMessage = (value: string) => {
  const normalized = collapseWhitespace(value);
  if (normalized.length < 10) return false;
  return normalized.split(' ').filter(Boolean).length >= 2;
};
const chatRateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isChatRateLimited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const existing = chatRateLimitStore.get(key);
  if (!existing || existing.resetAt <= now) {
    chatRateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (existing.count >= max) return true;
  existing.count += 1;
  chatRateLimitStore.set(key, existing);
  return false;
}

function enforceChatRateLimit(options: {
  scope: string;
  request: FastifyRequest;
  reply: FastifyReply;
  max: number;
  windowMs: number;
}) {
  const forwardedFor = String(options.request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = (forwardedFor || options.request.ip || 'unknown').slice(0, 120);
  const key = `${options.scope}:${ip}`;
  const limited = isChatRateLimited(key, options.max, options.windowMs);
  if (!limited) return false;
  options.reply.code(429).send({ error: 'Too many requests. Please slow down.' });
  return true;
}

const toObjectId = (value: string) => (ObjectId.isValid(value) ? new ObjectId(value) : null);

function normalizeChatHistoryText(value: string) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChatHistoryTextLen);
}

function buildRetrievalQuestion(question: string, history: Array<{ role: 'user' | 'assistant'; content: string }>) {
  const current = normalizeChatHistoryText(question);
  if (!current) return '';
  const previousUserTurns = history
    .filter((item) => item.role === 'user')
    .map((item) => normalizeChatHistoryText(item.content))
    .filter(Boolean)
    .slice(-2);
  const turns = [...previousUserTurns, current];
  const dedupedTurns: string[] = [];
  turns.forEach((turn) => {
    if (dedupedTurns[dedupedTurns.length - 1] !== turn) dedupedTurns.push(turn);
  });
  return dedupedTurns.join('\n');
}

async function appendChatMessage(options: {
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  locale: string;
  kind?: string;
  model?: string;
  intent?: string;
}) {
  const sessionObjectId = toObjectId(String(options.sessionId || ''));
  const messageText = String(options.text || '').trim().slice(0, 10000);
  if (!sessionObjectId || !messageText) return false;

  const db = await getDb();
  const sessions = db.collection('chat_sessions');
  const messages = db.collection('chat_messages');
  const now = new Date();
  const session = await sessions.findOne({ _id: sessionObjectId });
  if (!session) return false;

  await messages.insertOne({
    _id: new ObjectId(),
    sessionId: sessionObjectId,
    role: options.role,
    text: messageText,
    locale: String(options.locale || 'en').trim().toLowerCase(),
    kind: String(options.kind || 'message').trim().slice(0, 80),
    model: String(options.model || '').trim().slice(0, 120),
    intent: String(options.intent || '').trim().slice(0, 120),
    createdAt: now,
  });

  await sessions.updateOne(
    { _id: sessionObjectId },
    {
      $set: {
        updatedAt: now,
        lastMessageAt: now,
        lastRole: options.role,
        lastPreview: messageText.slice(0, 220),
      },
      $inc: { messageCount: 1 },
    },
  );

  return true;
}

server.get('/health', async () => ({ ok: true, service: 'meri-boarding-api' }));
server.get('/api/v1/health', async () => ({ ok: true, version: 'v1' }));

server.get('/api/v1/public/content/header', async (request, reply) => {
  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getHeaderContent(locale);
  return reply.send({ key: 'shared.header', locale, content });
});

server.get('/api/v1/public/settings/general', async (_request, reply) => {
  const content = await getGeneralSettingsContent();
  const publicContent = {
    siteIconUrl: content.siteIconUrl,
    socialLinks: content.socialLinks,
    formDelivery: {
      requestFormActionUrl: String(content?.formDelivery?.requestFormActionUrl || '').trim(),
    },
  };
  return reply.send({ key: 'shared.general_settings', content: publicContent });
});

server.get('/api/v1/public/content/home', async (request, reply) => {
  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getHomeContent(locale);
  return reply.send({ key: 'page.home', locale, content });
});

server.get('/api/v1/public/content/services', async (request, reply) => {
  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getServicesContent(locale);
  return reply.send({ key: 'page.services', locale, content });
});

server.get('/api/v1/public/content/amenities', async (request, reply) => {
  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getAmenitiesContent(locale);
  return reply.send({ key: 'page.amenities', locale, content });
});

server.get('/api/v1/public/content/reservation', async (request, reply) => {
  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getReservationContent(locale);
  return reply.send({ key: 'page.reservation', locale, content });
});

server.get('/api/v1/public/content/contact', async (request, reply) => {
  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getContactContent(locale);
  return reply.send({ key: 'page.contact', locale, content });
});

server.post('/api/v1/chat', async (request, reply) => {
  if (enforceChatRateLimit({ scope: 'chat:ask', request, reply, max: 45, windowMs: 60_000 })) return;

  const body = request.body as
    | {
        question?: string;
        locale?: string;
        topK?: number;
        sessionId?: string;
      }
    | undefined;

  const question = String(body?.question || '').trim();
  const locale = parseLocale(body?.locale);
  const topK = Math.max(1, Math.min(12, Number(body?.topK || 5)));
  const sessionId = String(body?.sessionId || '').trim();

  if (!question || question.length < 3) {
    return reply.code(400).send({ error: 'Question must be at least 3 characters.' });
  }
  if (question.length > 2000) {
    return reply.code(400).send({ error: 'Question is too long.' });
  }

  const timeout = Number.isFinite(ragRequestTimeoutMs) && ragRequestTimeoutMs > 0 ? ragRequestTimeoutMs : 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const sessionObjectId = toObjectId(sessionId);
    let history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (sessionObjectId) {
      const db = await getDb();
      const messages = db.collection('chat_messages');
      const rows = await messages
        .find({ sessionId: sessionObjectId, role: { $in: ['user', 'assistant'] } })
        .project({ _id: 0, role: 1, text: 1 })
        .sort({ createdAt: -1 })
        .limit(maxChatHistoryItems)
        .toArray();
      history = rows
        .reverse()
        .map((row: { role?: string; text?: string }) => {
          const role = String(row?.role || '').trim().toLowerCase() === 'assistant' ? 'assistant' : 'user';
          const content = normalizeChatHistoryText(row?.text || '');
          return { role, content };
        })
        .filter((row) => Boolean(row.content));
    }
    const retrievalQuestion = buildRetrievalQuestion(question, history);

    const ragResponse = await fetch(`${ragServiceUrl}/query`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        question,
        locale,
        topK,
        sessionId: sessionId || undefined,
        history,
        retrievalQuestion: retrievalQuestion || question,
      }),
      signal: controller.signal,
    });

    if (!ragResponse.ok) {
      const text = await ragResponse.text();
      request.log.error({ status: ragResponse.status, body: text }, 'rag-service returned error');
      return reply.code(502).send({ error: 'Chat service is temporarily unavailable.' });
    }

    const payload = await ragResponse.json();
    return reply.send(payload);
  } catch (error) {
    request.log.error(error, 'rag-service request failed');
    return reply.code(502).send({ error: 'Chat service is temporarily unavailable.' });
  } finally {
    clearTimeout(timer);
  }
});

server.post('/api/v1/chat/sessions', async (request, reply) => {
  if (enforceChatRateLimit({ scope: 'chat:session', request, reply, max: 12, windowMs: 60_000 })) return;

  const body = request.body as
    | {
        name?: string;
        email?: string;
        locale?: string;
        sourcePage?: string;
      }
    | undefined;

  const nameInput = String(body?.name || '').trim();
  const emailInput = String(body?.email || '').trim().toLowerCase();
  const locale = parseLocale(body?.locale);
  const sourcePage = String(body?.sourcePage || '/').trim().slice(0, 160) || '/';
  const name = nameInput.length >= 2 ? nameInput.slice(0, 160) : 'Guest';
  const email = emailRegex.test(emailInput)
    ? emailInput.slice(0, 200)
    : `guest.${Date.now()}.${Math.floor(Math.random() * 100000)}@chat.local`;

  const now = new Date();
  const forwardedFor = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = (forwardedFor || request.ip || '').slice(0, 120);
  const userAgent = String(request.headers['user-agent'] || '').trim().slice(0, 300);

  const db = await getDb();
  const sessions = db.collection('chat_sessions');

  const sessionId = new ObjectId();
  await sessions.insertOne({
    _id: sessionId,
    name,
    email,
    locale,
    sourcePage,
    messageCount: 0,
    status: 'open',
    isAnonymous: !emailRegex.test(emailInput),
    ip,
    userAgent,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    lastRole: 'system',
    lastPreview: '',
  });

  return reply.code(201).send({ ok: true, sessionId: sessionId.toHexString() });
});

server.post('/api/v1/chat/sessions/:sessionId/messages', async (request, reply) => {
  if (enforceChatRateLimit({ scope: 'chat:message', request, reply, max: 120, windowMs: 60_000 })) return;

  const params = request.params as { sessionId?: string } | undefined;
  const sessionId = String(params?.sessionId || '').trim();
  const body = request.body as
    | {
        role?: string;
        text?: string;
        locale?: string;
        kind?: string;
        model?: string;
        intent?: string;
      }
    | undefined;

  const roleRaw = String(body?.role || '').trim().toLowerCase();
  const role = roleRaw === 'assistant' || roleRaw === 'system' ? roleRaw : 'user';
  const text = String(body?.text || '').trim();
  const locale = parseLocale(body?.locale);
  const kind = String(body?.kind || 'message').trim().slice(0, 80);
  const model = String(body?.model || '').trim().slice(0, 120);
  const intent = String(body?.intent || '').trim().slice(0, 120);

  if (!text) {
    return reply.code(400).send({ error: 'Message text is required.' });
  }

  const ok = await appendChatMessage({
    sessionId,
    role: role as 'user' | 'assistant' | 'system',
    text,
    locale,
    kind,
    model,
    intent,
  }).catch(() => false);

  if (!ok) {
    return reply.code(404).send({ error: 'Session not found.' });
  }

  return reply.code(201).send({ ok: true });
});

server.post('/api/v1/chat/events', async (request, reply) => {
  if (enforceChatRateLimit({ scope: 'chat:event', request, reply, max: 240, windowMs: 60_000 })) return;

  const body = request.body as
    | {
        event?: string;
        locale?: string;
        intent?: string;
        model?: string;
        latencyMs?: number;
        sessionId?: string;
      }
    | undefined;

  const event = String(body?.event || '').trim().slice(0, 80);
  if (!event) {
    return reply.code(400).send({ error: 'Event is required.' });
  }

  const locale = parseLocale(body?.locale);
  const intent = String(body?.intent || '').trim().slice(0, 120);
  const model = String(body?.model || '').trim().slice(0, 120);
  const latencyMs = Math.max(0, Math.min(120000, Number(body?.latencyMs || 0)));
  const sessionId = String(body?.sessionId || '').trim();
  const forwardedFor = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = (forwardedFor || request.ip || '').slice(0, 120);
  const userAgent = String(request.headers['user-agent'] || '').trim().slice(0, 300);

  try {
    const db = await getDb();
    await db.collection('chat_events').insertOne({
      event,
      locale,
      intent,
      model,
      sessionId: toObjectId(sessionId) || null,
      latencyMs,
      ip,
      userAgent,
      createdAt: new Date(),
    });
    return reply.code(201).send({ ok: true });
  } catch (error) {
    request.log.error(error, 'chat event insert failed');
    return reply.code(202).send({ ok: false });
  }
});

server.post('/api/v1/public/forms/contact', async (request, reply) => {
  const body = request.body as
    | {
        locale?: string;
        sourcePage?: string;
        name?: string;
        email?: string;
        phone?: string;
        country?: string;
        subject?: string;
        message?: string;
      }
    | undefined;

  const locale = parseLocale(body?.locale);
  const sourcePage = String(body?.sourcePage || '/contact').trim().slice(0, 120) || '/contact';
  const name = String(body?.name || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const phone = String(body?.phone || '').trim();
  const country = String(body?.country || '').trim();
  const subject = String(body?.subject || '').trim();
  const message = collapseWhitespace(body?.message || '');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name || name.length < 2) {
    return reply.code(400).send({ error: 'Name must be at least 2 characters.' });
  }
  if (!emailRegex.test(email)) {
    return reply.code(400).send({ error: 'Valid email is required.' });
  }
  if (!phone || phone.length < 5) {
    return reply.code(400).send({ error: 'Phone is required.' });
  }
  if (!country || country.length < 2) {
    return reply.code(400).send({ error: 'Country is required.' });
  }
  if (!subject || subject.length < 2) {
    return reply.code(400).send({ error: 'Subject is required.' });
  }
  if (!isMeaningfulMessage(message)) {
    return reply.code(400).send({ error: 'Message must include at least 10 characters and 2 words.' });
  }
  if (message.length > 5000) {
    return reply.code(400).send({ error: 'Message is too long.' });
  }

  const now = new Date();
  const forwardedFor = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = (forwardedFor || request.ip || '').slice(0, 120);
  const userAgent = String(request.headers['user-agent'] || '').trim().slice(0, 300);
  const submission: ContactSubmission = {
    _id: new ObjectId(),
    locale,
    sourcePage,
    name: name.slice(0, 160),
    email: email.slice(0, 200),
    phone: phone.slice(0, 80),
    country: country.slice(0, 120),
    subject: subject.slice(0, 160),
    message,
    status: 'unread',
    mailSent: false,
    userAgent,
    ip,
    createdAt: now,
    updatedAt: now,
  };

  const submissions = await getContactSubmissionsCollection();
  await submissions.insertOne(submission);

  try {
    const recipients = await resolveContactNotificationRecipients(locale);
    const logoAttachment = await getMailLogoAttachment();
    const mailResult = await sendSmtpMail({
      to: recipients,
      subject: String(submission.subject || 'Inquiry').trim(),
      text: [
        'A new contact form submission has been received.',
        '',
        `Date: ${submission.createdAt.toISOString()}`,
        `Locale: ${submission.locale}`,
        `Source: ${submission.sourcePage}`,
        `Name: ${submission.name}`,
        `Email: ${submission.email}`,
        `Phone: ${submission.phone}`,
        `Country: ${submission.country || '-'}`,
        `Subject: ${submission.subject || '-'}`,
        '',
        'Message:',
        submission.message,
      ].join('\n'),
      html: renderBrandedMailHtml({
        title: String(submission.subject || 'Inquiry').trim(),
        subtitle: 'Contact Form Submission',
        rows: [
          { label: 'Date', value: formatMailDate(submission.createdAt, locale) },
          { label: 'Locale', value: submission.locale },
          { label: 'Source', value: submission.sourcePage },
          { label: 'Name', value: submission.name },
          { label: 'Email', value: submission.email },
          { label: 'Phone', value: submission.phone },
          { label: 'Country', value: submission.country || '-' },
          { label: 'Inquiry Topic', value: submission.subject || '-' },
        ],
        message: submission.message,
        locale,
        generatedAt: submission.createdAt,
      }),
      replyTo: submission.email,
      attachments: logoAttachment ? [logoAttachment] : undefined,
    });

    if (mailResult.sent) {
      await sendAutoReplyEmail({
        sendSmtpMail,
        locale,
        to: submission.email,
        type: 'contact',
        logoAttachment,
      }).catch(() => undefined);
      await submissions.updateOne(
        { _id: submission._id },
        { $set: { mailSent: true, mailError: '', updatedAt: new Date() } },
      );
      return reply.code(201).send({ ok: true, id: String(submission._id), mailSent: true });
    }

    await submissions.updateOne(
      { _id: submission._id },
      { $set: { mailSent: false, mailError: String(mailResult.error || 'Mail send failed.'), updatedAt: new Date() } },
    );

    return reply.code(202).send({
      ok: true,
      id: String(submission._id),
      mailSent: false,
      warning: 'Message saved but email notification failed.',
    });
  } catch (error) {
    await submissions.updateOne(
      { _id: submission._id },
      { $set: { mailSent: false, mailError: String((error as Error)?.message || 'Mail send failed.'), updatedAt: new Date() } },
    );
    return reply.code(202).send({
      ok: true,
      id: String(submission._id),
      mailSent: false,
      warning: 'Message saved but email notification failed.',
    });
  }
});

server.post('/api/v1/public/forms/request', async (request, reply) => {
  const body = request.body as
    | {
        locale?: string;
        sourcePage?: string;
        firstName?: string;
        lastName?: string;
        company?: string;
        email?: string;
        phone?: string;
        purpose?: string;
        nationality?: string;
        guests?: string | number;
        children?: string | number;
        accessible?: string | number | boolean;
        rooms?: string;
        boarding?: string;
        moveIn?: string;
        message?: string;
      }
    | undefined;

  const locale = parseLocale(body?.locale);
  const sourcePage = String(body?.sourcePage || '/reservation').trim().slice(0, 120) || '/reservation';
  const firstName = String(body?.firstName || '').trim();
  const lastName = String(body?.lastName || '').trim();
  const company = String(body?.company || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const phone = String(body?.phone || '').trim();
  const purpose = String(body?.purpose || '').trim();
  const nationality = String(body?.nationality || '').trim();
  const guestsRaw = String(body?.guests || '').trim();
  const guests = Number(guestsRaw);
  const childrenRaw = String(body?.children || '0').trim();
  const children = Number(childrenRaw);
  const accessibleRaw = body?.accessible;
  const accessibleProvided = accessibleRaw !== undefined && String(accessibleRaw).trim() !== '';
  const accessibleNormalized = String(accessibleRaw ?? '').trim().toLowerCase();
  const accessible =
    accessibleRaw === true ||
    accessibleRaw === 1 ||
    ['1', 'true', 'yes', 'ja', 'evet'].includes(accessibleNormalized);
  const accessibilityValue = accessibleProvided ? (accessible ? 'Yes' : 'No') : '-';
  const rooms = String(body?.rooms || '').trim();
  const boarding = String(body?.boarding || '').trim();
  const moveIn = String(body?.moveIn || '').trim();
  const message = String(body?.message || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!firstName || firstName.length < 2) {
    return reply.code(400).send({ error: 'First name is required.' });
  }
  if (!lastName || lastName.length < 2) {
    return reply.code(400).send({ error: 'Last name is required.' });
  }
  if (!emailRegex.test(email)) {
    return reply.code(400).send({ error: 'Valid email is required.' });
  }
  if (!phone || phone.length < 5) {
    return reply.code(400).send({ error: 'Phone is required.' });
  }
  if (!purpose || purpose.length < 2) {
    return reply.code(400).send({ error: 'Purpose is required.' });
  }
  if (!Number.isFinite(guests) || guests < 1) {
    return reply.code(400).send({ error: 'Number of guests is required.' });
  }
  if (!Number.isFinite(children) || children < 0) {
    return reply.code(400).send({ error: 'Number of child is invalid.' });
  }
  if (!rooms || rooms.length < 1) {
    return reply.code(400).send({ error: 'Number of rooms is required.' });
  }
  if (!boarding || boarding.length < 1) {
    return reply.code(400).send({ error: 'Boarding house is required.' });
  }
  if (message.length > 5000) {
    return reply.code(400).send({ error: 'Message is too long.' });
  }
  const submittedAt = new Date();

  try {
    const recipients = await resolveContactNotificationRecipients(locale);
    const logoAttachment = await getMailLogoAttachment();
    const mailResult = await sendSmtpMail({
      to: recipients,
      subject: `Request Quote: ${boarding}`,
      text: [
        'A new booking inquiry form submission has been received.',
        '',
        `Date: ${submittedAt.toISOString()}`,
        `Locale: ${locale}`,
        `Source: ${sourcePage}`,
        `First name: ${firstName}`,
        `Last name: ${lastName}`,
        `Company: ${company || '-'}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        `Purpose: ${purpose}`,
        `Nationality: ${nationality || '-'}`,
        `Guests: ${guests}`,
        `Children: ${children}`,
        `Accessibility need: ${accessibilityValue}`,
        `Rooms: ${rooms}`,
        `Boarding house: ${boarding}`,
        `Move-in date: ${moveIn || '-'}`,
        '',
        'Message:',
        message || '-',
      ].join('\n'),
      html: renderBrandedMailHtml({
        title: `Request Quote: ${boarding}`,
        subtitle: 'Booking Inquiry Submission',
        rows: [
          { label: 'Date', value: formatMailDate(submittedAt, locale) },
          { label: 'Locale', value: locale },
          { label: 'Source', value: sourcePage },
          { label: 'First Name', value: firstName },
          { label: 'Last Name', value: lastName },
          { label: 'Company', value: company || '-' },
          { label: 'Email', value: email },
          { label: 'Phone', value: phone },
          { label: 'Purpose', value: purpose },
          { label: 'Nationality', value: nationality || '-' },
          { label: 'Guests', value: String(guests) },
          { label: 'Children', value: String(children) },
          { label: 'Accessibility Need', value: accessibilityValue },
          { label: 'Rooms', value: rooms },
          { label: 'Boarding House', value: boarding },
          { label: 'Move-in Date', value: moveIn || '-' },
        ],
        message: message || '-',
        locale,
        generatedAt: submittedAt,
      }),
      replyTo: email,
      attachments: logoAttachment ? [logoAttachment] : undefined,
    });

    if (mailResult.sent) {
      await sendAutoReplyEmail({
        sendSmtpMail,
        locale,
        to: email,
        type: 'request',
        boarding,
        logoAttachment,
      }).catch(() => undefined);
      return reply.code(201).send({ ok: true, mailSent: true });
    }

    return reply.code(202).send({
      ok: true,
      mailSent: false,
      warning: 'Inquiry received but email notification failed.',
    });
  } catch {
    return reply.code(202).send({
      ok: true,
      mailSent: false,
      warning: 'Inquiry received but email notification failed.',
    });
  }
});

server.get('/api/v1/public/hotels', async (request, reply) => {
  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const rows = await hotels.find({ active: true }).sort({ order: 1, createdAt: 1 }).toArray();

  return reply.send({
    locale,
    hotels: rows.map((row) => {
      const content = normalizeHotelLocaleContent(locale, row.locales?.[locale], row.locales?.en);
      return {
        id: row._id.toHexString(),
        slug: row.slug,
        order: row.order,
        active: row.active,
        available: row.available !== false,
        name: content.name,
        location: content.location,
        shortDescription: content.shortDescription,
        facts: content.facts,
        coverImageUrl: row.coverImageUrl || content.gallery[0]?.url || '',
      };
    }),
  });
});

server.get('/api/v1/public/hotels/:slug', async (request, reply) => {
  const params = request.params as { slug?: string } | undefined;
  const slug = String(params?.slug || '').trim();
  if (!slug) {
    return reply.code(400).send({ error: 'Invalid slug' });
  }

  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const row =
    (await hotels.findOne({ slug, active: true })) ||
    (await hotels.findOne({ slug: { $regex: new RegExp(`^${escapeRegex(slug)}$`, 'i') }, active: true }));

  if (!row) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }

  const content = normalizeHotelLocaleContent(locale, row.locales?.[locale], row.locales?.en);
  const sharedGallery = normalizeHotelLocaleContent('en', row.locales?.en, row.locales?.[locale]).gallery;

  return reply.send({
    locale,
    hotel: {
      id: row._id.toHexString(),
      slug: row.slug,
      order: row.order,
      active: row.active,
      available: row.available !== false,
      coverImageUrl: row.coverImageUrl || content.gallery[0]?.url || '',
      ...content,
      gallery: sharedGallery.map((image) => ({
        ...image,
        meta: content.galleryMeta?.[image.id] || { sections: [] },
      })),
    },
  });
});

type AssetRouteRequest = FastifyRequest<{
  Params: { fileName?: string };
  Querystring: { w?: string; q?: string; original?: string };
}>;

async function serveAssetRequest(request: AssetRouteRequest, reply: FastifyReply, bucket: AssetBucket, uploadDir: string) {
  const fileName = sanitizeFilename(String(request.params.fileName || ''));
  if (!fileName) {
    return reply.code(404).send({ error: 'File not found' });
  }

  const filePath = path.join(uploadDir, fileName);
  const sourceStats = await stat(filePath).catch(() => null);
  if (!sourceStats) {
    return reply.code(404).send({ error: 'File not found' });
  }

  const query = request.query || {};
  const forceOriginal = String(query.original || '').trim() === '1';
  const requestedWidth = parseRequestedDimension(query.w, 256, assetWidthCeiling);
  const requestedQuality = parseRequestedDimension(query.q, 55, 95);
  const sourceExt = path.extname(fileName).toLowerCase().replace('.', '');
  const isImageSource = sourceExt === 'jpg' || sourceExt === 'jpeg' || sourceExt === 'png' || sourceExt === 'webp';
  const shouldTryWebp = !forceOriginal && isImageSource && supportsWebp(request.headers.accept);

  if (shouldTryWebp && (sourceExt !== 'webp' || Boolean(requestedWidth))) {
    const variantPath = await getOrCreateWebpVariant({
      bucket,
      sourceFilePath: filePath,
      sourceFileName: fileName,
      sourceSize: sourceStats.size,
      sourceMtimeMs: sourceStats.mtimeMs,
      width: requestedWidth,
      quality: requestedQuality,
    });
    if (variantPath) {
      reply.header('Cache-Control', 'public, max-age=31536000, immutable');
      reply.header('Vary', 'Accept');
      return reply.type('image/webp').send(createReadStream(variantPath));
    }
  }

  reply.header('Cache-Control', 'public, max-age=31536000, immutable');
  if (isImageSource) {
    reply.header('Vary', 'Accept');
  }
  return reply.type(extToMime(sourceExt)).send(createReadStream(filePath));
}

server.get('/api/v1/assets/avatars/:fileName', async (request, reply) => {
  return serveAssetRequest(request as AssetRouteRequest, reply, 'avatars', avatarUploadDir);
});

server.get('/api/v1/assets/hotels/:fileName', async (request, reply) => {
  return serveAssetRequest(request as AssetRouteRequest, reply, 'hotels', hotelUploadDir);
});

server.get('/api/v1/assets/home/:fileName', async (request, reply) => {
  return serveAssetRequest(request as AssetRouteRequest, reply, 'home', homeUploadDir);
});
}
