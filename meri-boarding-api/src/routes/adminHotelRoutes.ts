// @ts-nocheck
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { unlink } from 'node:fs/promises';
import type { RouteContext } from './context.js';

export async function registerAdminHotelRoutes(ctx: RouteContext) {
  const {
    server,
    getRequestAdmin,
    getDb,
    normalizeHotelLocaleContent,
    parseLocale,
    allowedLocales,
    hotelUploadDir,
    sanitizeFilename,
    parseDataUrl,
    saveUploadedImage,
    parseGalleryCategory,
    toSlug,
    ObjectId,
  } = ctx;

server.get('/api/v1/admin/hotels', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const rows = await hotels.find({}).sort({ order: 1, createdAt: 1 }).toArray();

  return reply.send({
    hotels: rows.map((row) => {
      const en = normalizeHotelLocaleContent('en', row.locales?.en, row.locales?.en);
      const de = normalizeHotelLocaleContent('de', row.locales?.de, en);
      const tr = normalizeHotelLocaleContent('tr', row.locales?.tr, en);

      return {
        id: row._id.toHexString(),
        slug: row.slug,
        order: row.order,
        active: row.active,
        available: row.available !== false,
        coverImageUrl: row.coverImageUrl || en.gallery[0]?.url || '',
        locales: { en, de, tr },
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }),
  });
});

server.post('/api/v1/admin/hotels', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can create hotels' });
  }

  const body = request.body as
    | {
        slug?: string;
        order?: number;
        active?: boolean;
        available?: boolean;
        locale?: ContentLocale;
        content?: Partial<HotelLocaleContent>;
      }
    | undefined;

  const active = body?.active === undefined ? true : Boolean(body?.active);
  const available = body?.available === undefined ? true : Boolean(body?.available);
  const locale = parseLocale(body?.locale);

  const normalized = normalizeHotelLocaleContent(locale, body?.content);
  if (!normalized.name || !normalized.shortDescription) {
    return reply.code(400).send({ error: 'Name and short description are required' });
  }

  const slug = toSlug(String(body?.slug || '').trim() || normalized.name);
  if (!slug) {
    return reply.code(400).send({ error: 'A valid slug could not be generated from name' });
  }

  const locales = {
    en: normalizeHotelLocaleContent('en', locale === 'en' ? normalized : { name: normalized.name }),
    de: normalizeHotelLocaleContent('de', locale === 'de' ? normalized : { name: normalized.name }),
    tr: normalizeHotelLocaleContent('tr', locale === 'tr' ? normalized : { name: normalized.name }),
  } as Record<ContentLocale, HotelLocaleContent>;

  locales[locale] = normalized;

  const now = new Date();
  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const lastHotelByOrder = await hotels.find({}).sort({ order: -1, createdAt: -1 }).limit(1).next();
  const nextAutoOrder = Math.max(1, Number(lastHotelByOrder?.order || 0) + 1);
  const order = Number.isFinite(body?.order) ? Math.max(1, Number(body?.order)) : nextAutoOrder;

  try {
    const result = await hotels.insertOne({
      _id: new ObjectId(),
      slug,
      order,
      active,
      available,
      coverImageUrl: normalized.gallery[0]?.url || '',
      locales,
      createdAt: now,
      updatedAt: now,
      updatedBy: admin._id,
    });
    return reply.code(201).send({ ok: true, id: result.insertedId.toHexString() });
  } catch {
    return reply.code(409).send({ error: 'Hotel could not be created. Slug may already exist.' });
  }
});

server.patch('/api/v1/admin/hotels/:hotelId', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update hotels' });
  }

  const params = request.params as { hotelId?: string } | undefined;
  const hotelId = String(params?.hotelId || '');
  if (!ObjectId.isValid(hotelId)) {
    return reply.code(400).send({ error: 'Invalid hotel id' });
  }

  const body = request.body as
    | {
        slug?: string;
        order?: number;
        active?: boolean;
        available?: boolean;
        locale?: ContentLocale;
        content?: Partial<HotelLocaleContent>;
        coverImageUrl?: string;
      }
    | undefined;

  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const row = await hotels.findOne({ _id: new ObjectId(hotelId) });

  if (!row) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }

  const locale = parseLocale(body?.locale);
  const currentLocale = normalizeHotelLocaleContent(locale, row.locales?.[locale], row.locales?.en);
  const nextLocale = normalizeHotelLocaleContent(locale, body?.content, currentLocale);

  const nextSlug =
    body?.slug === undefined
      ? row.slug
      : String(body.slug || '')
          .trim()
          .replace(/[^a-zA-Z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
  if (!nextSlug) {
    return reply.code(400).send({ error: 'Slug cannot be empty' });
  }

  const nextLocales = { ...row.locales, [locale]: nextLocale };
  const nextCoverImage =
    String(body?.coverImageUrl || '').trim() || row.coverImageUrl || nextLocale.gallery[0]?.url || '';

  try {
    await hotels.updateOne(
      { _id: row._id },
      {
        $set: {
          slug: nextSlug,
          order: body?.order === undefined ? row.order : Math.max(1, Number(body.order)),
          active: body?.active === undefined ? row.active : Boolean(body.active),
          available: body?.available === undefined ? row.available !== false : Boolean(body.available),
          locales: nextLocales,
          coverImageUrl: nextCoverImage,
          updatedAt: new Date(),
          updatedBy: admin._id,
        },
      },
    );
  } catch {
    return reply.code(409).send({ error: 'Slug already exists' });
  }

  return reply.send({ ok: true });
});

server.delete('/api/v1/admin/hotels/:hotelId', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can delete hotels' });
  }

  const params = request.params as { hotelId?: string } | undefined;
  const hotelId = String(params?.hotelId || '');
  if (!ObjectId.isValid(hotelId)) {
    return reply.code(400).send({ error: 'Invalid hotel id' });
  }

  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const row = await hotels.findOne({ _id: new ObjectId(hotelId) });

  if (!row) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }

  for (const locale of allowedLocales) {
    const gallery = row.locales?.[locale]?.gallery || [];
    for (const image of gallery) {
      const localFile = image.url.split('/api/v1/assets/hotels/')[1];
      if (localFile) {
        const filePath = path.join(hotelUploadDir, sanitizeFilename(localFile));
        await unlink(filePath).catch(() => undefined);
      }
    }
  }

  const result = await hotels.deleteOne({ _id: row._id });
  if (!result.acknowledged || result.deletedCount !== 1) {
    return reply.code(500).send({ error: 'Hotel could not be deleted from database' });
  }

  return reply.send({ ok: true });
});

server.post('/api/v1/admin/hotels/:hotelId/gallery', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload gallery images' });
  }

  const params = request.params as { hotelId?: string } | undefined;
  const hotelId = String(params?.hotelId || '');
  if (!ObjectId.isValid(hotelId)) {
    return reply.code(400).send({ error: 'Invalid hotel id' });
  }

  const body = request.body as
    | { locale?: ContentLocale; fileName?: string; dataUrl?: string; thumbnailDataUrl?: string; category?: string; alt?: string }
    | undefined;
  const locale = parseLocale(body?.locale);
  const parsed = parseDataUrl(String(body?.dataUrl || ''));
  const thumbnailParsed = body?.thumbnailDataUrl ? parseDataUrl(String(body.thumbnailDataUrl || '')) : null;

  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }

  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }
  if (body?.thumbnailDataUrl && !thumbnailParsed) {
    return reply.code(400).send({ error: 'Invalid thumbnail image format. Use PNG, JPG or WEBP data URL.' });
  }
  if (thumbnailParsed && thumbnailParsed.buffer.length > 2 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Thumbnail size cannot exceed 2MB' });
  }

  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const row = await hotels.findOne({ _id: new ObjectId(hotelId) });
  if (!row) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `hotel.${parsed.ext}`));
  const sourceExt: ImageFormat = parsed.ext === 'png' || parsed.ext === 'webp' ? parsed.ext : 'jpg';
  const savedMain = await saveUploadedImage({
    uploadDir: hotelUploadDir,
    bucket: 'hotels',
    filePrefix: row.slug,
    requestedName,
    sourceExt,
    sourceBuffer: parsed.buffer,
    maxDimension: 2400,
    quality: 82,
  });

  let thumbnailUrl = '';
  if (thumbnailParsed) {
    const thumbnailExt: ImageFormat = thumbnailParsed.ext === 'png' || thumbnailParsed.ext === 'webp' ? thumbnailParsed.ext : 'jpg';
    const savedThumbnail = await saveUploadedImage({
      uploadDir: hotelUploadDir,
      bucket: 'hotels',
      filePrefix: `${row.slug}-thumb`,
      requestedName,
      sourceExt: thumbnailExt,
      sourceBuffer: thumbnailParsed.buffer,
      maxDimension: 900,
      quality: 78,
    });
    thumbnailUrl = savedThumbnail.url;
  }

  const current = normalizeHotelLocaleContent('en', row.locales?.en, row.locales?.[locale]);
  const image: HotelGalleryImage = {
    id: randomBytes(12).toString('hex'),
    url: savedMain.url,
    thumbnailUrl: thumbnailUrl || savedMain.url,
    category: parseGalleryCategory(body?.category),
    alt: String(body?.alt || `${current.name} image`).trim(),
    sortOrder: current.gallery.length + 1,
  };

  const nextSharedGallery = [...current.gallery, image];
  const localesPatch = allowedLocales.reduce((acc, localeKey) => {
    const localeContent = normalizeHotelLocaleContent(localeKey, row.locales?.[localeKey], row.locales?.en);
    acc[`locales.${localeKey}`] = normalizeHotelLocaleContent(localeKey, {
      ...localeContent,
      gallery: nextSharedGallery,
    });
    return acc;
  }, {} as Record<string, HotelLocaleContent>);

  await hotels.updateOne(
    { _id: row._id },
    {
      $set: {
        ...localesPatch,
        coverImageUrl: row.coverImageUrl || image.url,
        updatedAt: new Date(),
        updatedBy: admin._id,
      },
    },
  );

  return reply.send({ ok: true, image });
});

server.post('/api/v1/admin/hotels/:hotelId/cover', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload cover images' });
  }

  const params = request.params as { hotelId?: string } | undefined;
  const hotelId = String(params?.hotelId || '');
  if (!ObjectId.isValid(hotelId)) {
    return reply.code(400).send({ error: 'Invalid hotel id' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string } | undefined;
  const parsed = parseDataUrl(String(body?.dataUrl || ''));

  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }

  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }

  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const row = await hotels.findOne({ _id: new ObjectId(hotelId) });
  if (!row) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `cover.${parsed.ext}`));
  const sourceExt: ImageFormat = parsed.ext === 'png' || parsed.ext === 'webp' ? parsed.ext : 'jpg';
  const savedCover = await saveUploadedImage({
    uploadDir: hotelUploadDir,
    bucket: 'hotels',
    filePrefix: `${row.slug}-cover`,
    requestedName,
    sourceExt,
    sourceBuffer: parsed.buffer,
    maxDimension: 2400,
    quality: 82,
  });
  const coverImageUrl = savedCover.url;

  await hotels.updateOne(
    { _id: row._id },
    {
      $set: {
        coverImageUrl,
        updatedAt: new Date(),
        updatedBy: admin._id,
      },
    },
  );

  return reply.send({ ok: true, coverImageUrl });
});

server.delete('/api/v1/admin/hotels/:hotelId/gallery/:imageId', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can delete gallery images' });
  }

  const params = request.params as { hotelId?: string; imageId?: string } | undefined;
  const hotelId = String(params?.hotelId || '');
  const imageId = String(params?.imageId || '').trim();

  if (!ObjectId.isValid(hotelId) || !imageId) {
    return reply.code(400).send({ error: 'Invalid parameters' });
  }

  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const db = await getDb();
  const hotels = db.collection<HotelEntity>('hotels');
  const row = await hotels.findOne({ _id: new ObjectId(hotelId) });
  if (!row) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }

  const current = normalizeHotelLocaleContent('en', row.locales?.en, row.locales?.[locale]);
  const target = current.gallery.find((item) => item.id === imageId);
  if (!target) {
    return reply.code(404).send({ error: 'Image not found' });
  }

  const nextGallery = current.gallery.filter((item) => item.id !== imageId).map((item, idx) => ({ ...item, sortOrder: idx + 1 }));
  const localesPatch = allowedLocales.reduce((acc, localeKey) => {
    const localeContent = normalizeHotelLocaleContent(localeKey, row.locales?.[localeKey], row.locales?.en);
    const nextGalleryMeta = { ...(localeContent.galleryMeta || {}) };
    delete nextGalleryMeta[imageId];
    acc[`locales.${localeKey}`] = normalizeHotelLocaleContent(localeKey, {
      ...localeContent,
      gallery: nextGallery,
      galleryMeta: nextGalleryMeta,
    });
    return acc;
  }, {} as Record<string, HotelLocaleContent>);

  await hotels.updateOne(
    { _id: row._id },
    { $set: { ...localesPatch, updatedAt: new Date(), updatedBy: admin._id } },
  );

  const localFile = target.url.split('/api/v1/assets/hotels/')[1];
  if (localFile) {
    const filePath = path.join(hotelUploadDir, sanitizeFilename(localFile));
    await unlink(filePath).catch(() => undefined);
  }
  const localThumb = String(target.thumbnailUrl || '').split('/api/v1/assets/hotels/')[1];
  if (localThumb && localThumb !== localFile) {
    const thumbPath = path.join(hotelUploadDir, sanitizeFilename(localThumb));
    await unlink(thumbPath).catch(() => undefined);
  }

  return reply.send({ ok: true });
});
}
