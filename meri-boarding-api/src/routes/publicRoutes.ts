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
  return reply.send({ key: 'shared.general_settings', content });
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
  const body = request.body as
    | {
        question?: string;
        locale?: string;
        topK?: number;
      }
    | undefined;

  const question = String(body?.question || '').trim();
  const locale = parseLocale(body?.locale);
  const topK = Math.max(1, Math.min(12, Number(body?.topK || 5)));

  if (!question || question.length < 3) {
    return reply.code(400).send({ error: 'Question must be at least 3 characters.' });
  }

  const timeout = Number.isFinite(ragRequestTimeoutMs) && ragRequestTimeoutMs > 0 ? ragRequestTimeoutMs : 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const ragResponse = await fetch(`${ragServiceUrl}/query`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, locale, topK }),
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
  const message = String(body?.message || '').trim();
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
  if (!message || message.length < 5) {
    return reply.code(400).send({ error: 'Message must be at least 5 characters.' });
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
    const mailResult = await sendSmtpMail({
      to: recipients,
      subject: `New Contact Message - ${submission.subject || 'General'} - ${submission.name}`,
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
    });

    if (mailResult.sent) {
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
