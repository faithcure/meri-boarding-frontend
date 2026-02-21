// @ts-nocheck
import type { RouteContext } from './context.js';

export async function registerAdminContentRoutes(ctx: RouteContext) {
  const {
    server,
    getRequestAdmin,
    parseLocale,
    getHeaderContent,
    normalizeHeaderContent,
    defaultHeaderContent,
    getGeneralSettingsContent,
    normalizeGeneralSettingsContent,
    defaultGeneralSettingsContent,
    isValidImagePathOrUrl,
    allowedSocialPlatforms,
    isValidSocialUrl,
    getDb,
    getHomeContent,
    getServicesContent,
    getLocalizedDefaultServicesContent,
    normalizeServicesContent,
    validateServicesContent,
    getAmenitiesContent,
    getLocalizedDefaultAmenitiesContent,
    normalizeAmenitiesContent,
    validateAmenitiesContent,
    getReservationContent,
    getLocalizedDefaultReservationContent,
    normalizeReservationContent,
    validateReservationContent,
    getContactContent,
    getLocalizedDefaultContactContent,
    normalizeContactContent,
    validateContactContent,
    canManageContent,
    escapeRegex,
    getContactSubmissionsCollection,
    formatContactSubmission,
    defaultHomeContent,
    normalizeHomeContent,
    validateHomeContent,
    mergeRoomsCardsWithSharedMedia,
    allowedLocales,
    parseDataUrl,
    sanitizeFilename,
    saveUploadedImage,
    parseSiteIconDataUrl,
    saveRawUploadedAsset,
    unlink,
    path,
    homeUploadDir,
    assetWidthCeiling,
    assetPrewarmWidths,
    prewarmAssetBucket,
    avatarUploadDir,
    hotelUploadDir,
    hashPassword,
    ObjectId,
  } = ctx;

server.get('/api/v1/admin/content/header', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getHeaderContent(locale);

  return reply.send({ key: 'shared.header', locale, content });
});

server.put('/api/v1/admin/content/header', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update this route' });
  }

  const body = request.body as { locale?: string; content?: Partial<HeaderContent> } | undefined;
  const locale = parseLocale(body?.locale);
  const nextContent = normalizeHeaderContent(body?.content, defaultHeaderContent[locale]);

  if (Object.values(nextContent).some((value) => !value)) {
    return reply.code(400).send({ error: 'All header fields are required' });
  }

  const db = await getDb();
  const contents = db.collection<ContentEntry<HeaderContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });

  const now = new Date();
  await contents.updateOne(
    { key: 'shared.header', locale },
    {
      $set: {
        value: nextContent,
        updatedAt: now,
        updatedBy: admin._id,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        key: 'shared.header',
        locale,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return reply.send({ ok: true, locale, content: nextContent });
});

server.get('/api/v1/admin/settings/general', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const content = await getGeneralSettingsContent();
  return reply.send({ key: 'shared.general_settings', content });
});

server.put('/api/v1/admin/settings/general', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update this route' });
  }

  const body = request.body as { content?: Partial<GeneralSettingsContent> } | undefined;
  const nextContent = normalizeGeneralSettingsContent(body?.content, defaultGeneralSettingsContent);

  if (!isValidImagePathOrUrl(nextContent.siteIconUrl)) {
    return reply.code(400).send({ error: 'Site icon URL must start with "/" or "http(s)://".' });
  }
  if (!Array.isArray(nextContent.socialLinks)) {
    return reply.code(400).send({ error: 'Social links must be an array.' });
  }
  if (nextContent.socialLinks.length > 40) {
    return reply.code(400).send({ error: 'Social link limit is 40.' });
  }
  for (const [index, item] of nextContent.socialLinks.entries()) {
    const platform = String(item?.platform || '').trim().toLowerCase();
    if (!allowedSocialPlatforms.includes(platform as (typeof allowedSocialPlatforms)[number])) {
      return reply.code(400).send({ error: `Social link ${index + 1}: invalid platform.` });
    }
    if (!String(item?.label || '').trim()) {
      return reply.code(400).send({ error: `Social link ${index + 1}: label is required.` });
    }
    if (!isValidSocialUrl(String(item?.url || ''))) {
      return reply.code(400).send({ error: `Social link ${index + 1}: URL must start with "http(s)://".` });
    }
  }

  const db = await getDb();
  const contents = db.collection<ContentEntry<GeneralSettingsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });

  const now = new Date();
  await contents.updateOne(
    { key: 'shared.general_settings', locale: 'en' },
    {
      $set: {
        value: nextContent,
        updatedAt: now,
        updatedBy: admin._id,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        key: 'shared.general_settings',
        locale: 'en',
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return reply.send({ ok: true, content: nextContent });
});

server.get('/api/v1/admin/content/home', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getHomeContent(locale);

  return reply.send({ key: 'page.home', locale, content });
});

server.get('/api/v1/admin/content/services', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getServicesContent(locale);

  return reply.send({ key: 'page.services', locale, content });
});

server.put('/api/v1/admin/content/services', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update this route' });
  }

  const body = request.body as { locale?: string; content?: Partial<ServicesCmsContent> } | undefined;
  const locale = parseLocale(body?.locale);

  const db = await getDb();
  const contents = db.collection<ContentEntry<ServicesCmsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });
  const localizedFallback = await getLocalizedDefaultServicesContent(locale);
  const existing = await contents.findOne({ key: 'page.services', locale });
  const fallbackContent = existing ? normalizeServicesContent(existing.value, localizedFallback) : localizedFallback;
  const nextContent = normalizeServicesContent(body?.content, fallbackContent);
  const validationError = validateServicesContent(nextContent);
  if (validationError) {
    return reply.code(400).send({ error: validationError });
  }

  const now = new Date();
  await contents.updateOne(
    { key: 'page.services', locale },
    {
      $set: {
        value: nextContent,
        updatedAt: now,
        updatedBy: admin._id,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        key: 'page.services',
        locale,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return reply.send({ ok: true, locale, content: nextContent });
});

server.get('/api/v1/admin/content/amenities', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getAmenitiesContent(locale);

  return reply.send({ key: 'page.amenities', locale, content });
});

server.put('/api/v1/admin/content/amenities', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update this route' });
  }

  const body = request.body as { locale?: string; content?: Partial<AmenitiesCmsContent> } | undefined;
  const locale = parseLocale(body?.locale);

  const db = await getDb();
  const contents = db.collection<ContentEntry<AmenitiesCmsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });
  const localizedFallback = await getLocalizedDefaultAmenitiesContent(locale);
  const existing = await contents.findOne({ key: 'page.amenities', locale });
  const fallbackContent = existing ? normalizeAmenitiesContent(existing.value, localizedFallback) : localizedFallback;
  const nextContent = normalizeAmenitiesContent(body?.content, fallbackContent);
  const validationError = validateAmenitiesContent(nextContent);
  if (validationError) {
    return reply.code(400).send({ error: validationError });
  }

  const now = new Date();
  await contents.updateOne(
    { key: 'page.amenities', locale },
    {
      $set: {
        value: nextContent,
        updatedAt: now,
        updatedBy: admin._id,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        key: 'page.amenities',
        locale,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return reply.send({ ok: true, locale, content: nextContent });
});

server.get('/api/v1/admin/content/reservation', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getReservationContent(locale);

  return reply.send({ key: 'page.reservation', locale, content });
});

server.put('/api/v1/admin/content/reservation', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update this route' });
  }

  const body = request.body as { locale?: string; content?: Partial<ReservationCmsContent> } | undefined;
  const locale = parseLocale(body?.locale);

  const db = await getDb();
  const contents = db.collection<ContentEntry<ReservationCmsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });
  const localizedFallback = await getLocalizedDefaultReservationContent(locale);
  const existing = await contents.findOne({ key: 'page.reservation', locale });
  const fallbackContent = existing ? normalizeReservationContent(existing.value, localizedFallback) : localizedFallback;
  const nextContent = normalizeReservationContent(body?.content, fallbackContent);
  const validationError = validateReservationContent(nextContent);
  if (validationError) {
    return reply.code(400).send({ error: validationError });
  }

  const now = new Date();
  await contents.updateOne(
    { key: 'page.reservation', locale },
    {
      $set: {
        value: nextContent,
        updatedAt: now,
        updatedBy: admin._id,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        key: 'page.reservation',
        locale,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return reply.send({ ok: true, locale, content: nextContent });
});

server.get('/api/v1/admin/content/contact', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as { locale?: string } | undefined;
  const locale = parseLocale(query?.locale);
  const content = await getContactContent(locale);

  return reply.send({ key: 'page.contact', locale, content });
});

server.put('/api/v1/admin/content/contact', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update this route' });
  }

  const body = request.body as { locale?: string; content?: Partial<ContactCmsContent> } | undefined;
  const locale = parseLocale(body?.locale);

  const db = await getDb();
  const contents = db.collection<ContentEntry<ContactCmsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });
  const localizedFallback = await getLocalizedDefaultContactContent(locale);
  const existing = await contents.findOne({ key: 'page.contact', locale });
  const fallbackContent = existing ? normalizeContactContent(existing.value, localizedFallback) : localizedFallback;
  const nextContent = normalizeContactContent(body?.content, fallbackContent);
  const validationError = validateContactContent(nextContent);
  if (validationError) {
    return reply.code(400).send({ error: validationError });
  }

  const now = new Date();
  await contents.updateOne(
    { key: 'page.contact', locale },
    {
      $set: {
        value: nextContent,
        updatedAt: now,
        updatedBy: admin._id,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        key: 'page.contact',
        locale,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return reply.send({ ok: true, locale, content: nextContent });
});

server.get('/api/v1/admin/contact-submissions', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!canManageContent(admin)) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as
    | {
        status?: string;
        page?: string | number;
        limit?: string | number;
        search?: string;
      }
    | undefined;

  const statusRaw = String(query?.status || 'all').trim().toLowerCase();
  const status = statusRaw === 'read' || statusRaw === 'unread' ? (statusRaw as ContactSubmissionStatus) : 'all';
  const page = Math.max(1, Number(query?.page || 1));
  const limit = Math.min(100, Math.max(5, Number(query?.limit || 25)));
  const search = String(query?.search || '').trim().slice(0, 120);
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};

  if (status !== 'all') {
    filter.status = status;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { country: regex },
      { subject: regex },
      { message: regex },
      { sourcePage: regex },
    ];
  }

  const submissions = await getContactSubmissionsCollection();
  const [items, total, unreadCount, readCount] = await Promise.all([
    submissions.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    submissions.countDocuments(filter),
    submissions.countDocuments({ status: 'unread' }),
    submissions.countDocuments({ status: 'read' }),
  ]);

  return reply.send({
    items: items.map(formatContactSubmission),
    total,
    page,
    limit,
    counts: {
      unread: unreadCount,
      read: readCount,
      all: unreadCount + readCount,
    },
  });
});

server.patch('/api/v1/admin/contact-submissions/:submissionId', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!canManageContent(admin)) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update this route' });
  }

  const params = request.params as { submissionId?: string } | undefined;
  const submissionId = String(params?.submissionId || '');
  if (!ObjectId.isValid(submissionId)) {
    return reply.code(400).send({ error: 'Invalid submission id' });
  }

  const body = request.body as { status?: string } | undefined;
  const nextStatus = String(body?.status || '').trim().toLowerCase();
  if (nextStatus !== 'read' && nextStatus !== 'unread') {
    return reply.code(400).send({ error: 'Status must be "read" or "unread"' });
  }

  const now = new Date();
  const submissions = await getContactSubmissionsCollection();
  const result =
    nextStatus === 'read'
      ? await submissions.updateOne(
          { _id: new ObjectId(submissionId) },
          { $set: { status: 'read', readAt: now, updatedAt: now } },
        )
      : await submissions.updateOne(
          { _id: new ObjectId(submissionId) },
          { $set: { status: 'unread', updatedAt: now }, $unset: { readAt: '' } },
        );

  if (!result.matchedCount) {
    return reply.code(404).send({ error: 'Submission not found' });
  }

  return reply.send({ ok: true });
});

server.delete('/api/v1/admin/contact-submissions/:submissionId', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!canManageContent(admin)) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can delete this route' });
  }

  const params = request.params as { submissionId?: string } | undefined;
  const submissionId = String(params?.submissionId || '');
  if (!ObjectId.isValid(submissionId)) {
    return reply.code(400).send({ error: 'Invalid submission id' });
  }

  const submissions = await getContactSubmissionsCollection();
  const result = await submissions.deleteOne({ _id: new ObjectId(submissionId) });
  if (!result.deletedCount) {
    return reply.code(404).send({ error: 'Submission not found' });
  }

  return reply.send({ ok: true });
});

server.put('/api/v1/admin/content/home', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can update this route' });
  }

  const body = request.body as { locale?: string; content?: Partial<HomeCmsContent> } | undefined;
  const locale = parseLocale(body?.locale);

  const db = await getDb();
  const contents = db.collection<ContentEntry<HomeCmsContent>>('content_entries');
  await contents.createIndex({ key: 1, locale: 1 }, { unique: true });
  const existing = await contents.findOne({ key: 'page.home', locale });
  const fallbackContent = existing ? normalizeHomeContent(existing.value, defaultHomeContent) : defaultHomeContent;
  const nextContent = normalizeHomeContent(body?.content, fallbackContent);
  const validationError = validateHomeContent(nextContent);
  if (validationError) {
    return reply.code(400).send({ error: validationError });
  }

  const now = new Date();
  await contents.updateOne(
    { key: 'page.home', locale },
    {
      $set: {
        value: nextContent,
        updatedAt: now,
        updatedBy: admin._id,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        key: 'page.home',
        locale,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  // Keep sections shared for all locales.
  if (body?.content?.sections) {
    for (const localeKey of allowedLocales) {
      if (localeKey === locale) continue;
      const row = await contents.findOne({ key: 'page.home', locale: localeKey });
      const current = row ? normalizeHomeContent(row.value, defaultHomeContent) : defaultHomeContent;
      const patched = normalizeHomeContent({ ...current, sections: nextContent.sections }, current);
      await contents.updateOne(
        { key: 'page.home', locale: localeKey },
        {
          $set: {
            value: patched,
            updatedAt: now,
            updatedBy: admin._id,
          },
          $setOnInsert: {
            _id: new ObjectId(),
            key: 'page.home',
            locale: localeKey,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }

  // Keep booking partners shared for all locales.
  if (Array.isArray(body?.content?.hero?.bookingPartners)) {
    for (const localeKey of allowedLocales) {
      if (localeKey === locale) continue;
      const row = await contents.findOne({ key: 'page.home', locale: localeKey });
      const current = row ? normalizeHomeContent(row.value, defaultHomeContent) : defaultHomeContent;
      const patched = normalizeHomeContent(
        {
          ...current,
          hero: {
            ...current.hero,
            bookingPartners: nextContent.hero.bookingPartners,
          },
        },
        current,
      );
      await contents.updateOne(
        { key: 'page.home', locale: localeKey },
        {
          $set: {
            value: patched,
            updatedAt: now,
            updatedBy: admin._id,
          },
          $setOnInsert: {
            _id: new ObjectId(),
            key: 'page.home',
            locale: localeKey,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }

  // Keep rooms card image + icon shared for all locales.
  if (body?.content?.rooms?.cards) {
    for (const localeKey of allowedLocales) {
      if (localeKey === locale) continue;
      const row = await contents.findOne({ key: 'page.home', locale: localeKey });
      const current = row ? normalizeHomeContent(row.value, defaultHomeContent) : defaultHomeContent;
      const mergedCards = mergeRoomsCardsWithSharedMedia(current.rooms.cards, nextContent.rooms.cards);
      const patched = normalizeHomeContent(
        {
          ...current,
          rooms: {
            ...current.rooms,
            cards: mergedCards,
          },
        },
        current,
      );
      await contents.updateOne(
        { key: 'page.home', locale: localeKey },
        {
          $set: {
            value: patched,
            updatedAt: now,
            updatedBy: admin._id,
          },
          $setOnInsert: {
            _id: new ObjectId(),
            key: 'page.home',
            locale: localeKey,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }

  // Keep testimonials media + numeric stat shared for all locales.
  if (body?.content?.testimonials) {
    for (const localeKey of allowedLocales) {
      if (localeKey === locale) continue;
      const row = await contents.findOne({ key: 'page.home', locale: localeKey });
      const current = row ? normalizeHomeContent(row.value, defaultHomeContent) : defaultHomeContent;
      const patched = normalizeHomeContent(
        {
          ...current,
          testimonials: {
            ...current.testimonials,
            apartmentsCount: nextContent.testimonials.apartmentsCount,
            backgroundImage: nextContent.testimonials.backgroundImage,
          },
        },
        current,
      );
      await contents.updateOne(
        { key: 'page.home', locale: localeKey },
        {
          $set: {
            value: patched,
            updatedAt: now,
            updatedBy: admin._id,
          },
          $setOnInsert: {
            _id: new ObjectId(),
            key: 'page.home',
            locale: localeKey,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }

  // Keep facilities media + numeric stats shared for all locales.
  if (body?.content?.facilities) {
    for (const localeKey of allowedLocales) {
      if (localeKey === locale) continue;
      const row = await contents.findOne({ key: 'page.home', locale: localeKey });
      const current = row ? normalizeHomeContent(row.value, defaultHomeContent) : defaultHomeContent;
      const patched = normalizeHomeContent(
        {
          ...current,
          facilities: {
            ...current.facilities,
            primaryImage: nextContent.facilities.primaryImage,
            secondaryImage: nextContent.facilities.secondaryImage,
            statsNumbers: nextContent.facilities.statsNumbers,
          },
        },
        current,
      );
      await contents.updateOne(
        { key: 'page.home', locale: localeKey },
        {
          $set: {
            value: patched,
            updatedAt: now,
            updatedBy: admin._id,
          },
          $setOnInsert: {
            _id: new ObjectId(),
            key: 'page.home',
            locale: localeKey,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }

  // Keep gallery structure (categories + items) shared for all locales.
  if (body?.content?.gallery) {
    for (const localeKey of allowedLocales) {
      if (localeKey === locale) continue;
      const row = await contents.findOne({ key: 'page.home', locale: localeKey });
      const current = row ? normalizeHomeContent(row.value, defaultHomeContent) : defaultHomeContent;
      const patched = normalizeHomeContent(
        {
          ...current,
          gallery: {
            ...current.gallery,
            categories: nextContent.gallery.categories,
            items: nextContent.gallery.items,
          },
        },
        current,
      );
      await contents.updateOne(
        { key: 'page.home', locale: localeKey },
        {
          $set: {
            value: patched,
            updatedAt: now,
            updatedBy: admin._id,
          },
          $setOnInsert: {
            _id: new ObjectId(),
            key: 'page.home',
            locale: localeKey,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }

  // Keep offers card images shared for all locales.
  if (body?.content?.offers) {
    for (const localeKey of allowedLocales) {
      if (localeKey === locale) continue;
      const row = await contents.findOne({ key: 'page.home', locale: localeKey });
      const current = row ? normalizeHomeContent(row.value, defaultHomeContent) : defaultHomeContent;
      const patched = normalizeHomeContent(
        {
          ...current,
          offers: {
            ...current.offers,
            cards: nextContent.offers.cards.map((card) => {
              const currentCard = current.offers.cards.find((item) => item.id === card.id);
              return {
                ...card,
                badge: String(currentCard?.badge ?? card.badge ?? '').trim(),
                title: String(currentCard?.title ?? card.title ?? '').trim(),
                text: String(currentCard?.text ?? card.text ?? '').trim(),
                image: card.image || currentCard?.image || '',
              };
            }),
          },
        },
        current,
      );
      await contents.updateOne(
        { key: 'page.home', locale: localeKey },
        {
          $set: {
            value: patched,
            updatedAt: now,
            updatedBy: admin._id,
          },
          $setOnInsert: {
            _id: new ObjectId(),
            key: 'page.home',
            locale: localeKey,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }

  return reply.send({ ok: true, locale, content: nextContent });
});

server.post('/api/v1/admin/content/home/hero-image', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload hero images' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string } | undefined;
  const parsed = parseDataUrl(String(body?.dataUrl || ''));
  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }
  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `home-hero.${parsed.ext}`));
  const sourceExt: ImageFormat = parsed.ext === 'png' || parsed.ext === 'webp' ? parsed.ext : 'jpg';
  const savedImage = await saveUploadedImage({
    uploadDir: homeUploadDir,
    bucket: 'home',
    filePrefix: 'home-hero',
    requestedName,
    sourceExt,
    sourceBuffer: parsed.buffer,
    maxDimension: 2400,
    quality: 82,
  });

  return reply.send({ ok: true, imageUrl: savedImage.url });
});

server.post('/api/v1/admin/content/home/partner-logo', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload partner logos' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string; oldLogoUrl?: string } | undefined;
  const parsed = parseSiteIconDataUrl(String(body?.dataUrl || ''));
  if (!parsed || (parsed.ext !== 'png' && parsed.ext !== 'svg')) {
    return reply.code(400).send({ error: 'Invalid logo format. Use PNG or SVG data URL.' });
  }
  if (parsed.buffer.length > 4 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Logo size cannot exceed 4MB' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `partner-logo.${parsed.ext}`));
  const savedLogo = await saveRawUploadedAsset({
    uploadDir: homeUploadDir,
    bucket: 'home',
    filePrefix: 'home-partner-logo',
    requestedName,
    ext: parsed.ext,
    sourceBuffer: parsed.buffer,
  });

  const oldLogoUrl = String(body?.oldLogoUrl || '').trim();
  const oldLogoFileName = oldLogoUrl.split('/api/v1/assets/home/')[1];
  if (oldLogoFileName) {
    const safeOldLogoFileName = sanitizeFilename(oldLogoFileName);
    if (safeOldLogoFileName && safeOldLogoFileName !== savedLogo.fileName) {
      await unlink(path.join(homeUploadDir, safeOldLogoFileName)).catch(() => undefined);
    }
  }

  return reply.send({ ok: true, imageUrl: savedLogo.url });
});

server.post('/api/v1/admin/content/home/rooms-image', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload rooms images' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string } | undefined;
  const parsed = parseDataUrl(String(body?.dataUrl || ''));
  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }
  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `home-rooms.${parsed.ext}`));
  const sourceExt: ImageFormat = parsed.ext === 'png' || parsed.ext === 'webp' ? parsed.ext : 'jpg';
  const savedImage = await saveUploadedImage({
    uploadDir: homeUploadDir,
    bucket: 'home',
    filePrefix: 'home-rooms',
    requestedName,
    sourceExt,
    sourceBuffer: parsed.buffer,
    maxDimension: 2200,
    quality: 82,
  });

  return reply.send({ ok: true, imageUrl: savedImage.url });
});

server.post('/api/v1/admin/content/home/testimonials-image', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload testimonials images' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string } | undefined;
  const parsed = parseDataUrl(String(body?.dataUrl || ''));
  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }
  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `home-testimonials.${parsed.ext}`));
  const sourceExt: ImageFormat = parsed.ext === 'png' || parsed.ext === 'webp' ? parsed.ext : 'jpg';
  const savedImage = await saveUploadedImage({
    uploadDir: homeUploadDir,
    bucket: 'home',
    filePrefix: 'home-testimonials',
    requestedName,
    sourceExt,
    sourceBuffer: parsed.buffer,
    maxDimension: 2200,
    quality: 82,
  });

  return reply.send({ ok: true, imageUrl: savedImage.url });
});

server.post('/api/v1/admin/content/home/facilities-image', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload facilities images' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string } | undefined;
  const parsed = parseDataUrl(String(body?.dataUrl || ''));
  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }
  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `home-facilities.${parsed.ext}`));
  const sourceExt: ImageFormat = parsed.ext === 'png' || parsed.ext === 'webp' ? parsed.ext : 'jpg';
  const savedImage = await saveUploadedImage({
    uploadDir: homeUploadDir,
    bucket: 'home',
    filePrefix: 'home-facilities',
    requestedName,
    sourceExt,
    sourceBuffer: parsed.buffer,
    maxDimension: 2200,
    quality: 82,
  });

  return reply.send({ ok: true, imageUrl: savedImage.url });
});

server.post('/api/v1/admin/content/home/gallery-image', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload gallery images' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string } | undefined;
  const parsed = parseDataUrl(String(body?.dataUrl || ''));
  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }
  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `home-gallery.${parsed.ext}`));
  const sourceExt: ImageFormat = parsed.ext === 'png' || parsed.ext === 'webp' ? parsed.ext : 'jpg';
  const savedImage = await saveUploadedImage({
    uploadDir: homeUploadDir,
    bucket: 'home',
    filePrefix: 'home-gallery',
    requestedName,
    sourceExt,
    sourceBuffer: parsed.buffer,
    maxDimension: 2200,
    quality: 82,
  });

  return reply.send({ ok: true, imageUrl: savedImage.url });
});

server.post('/api/v1/admin/content/home/offers-image', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload offers images' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string } | undefined;
  const parsed = parseDataUrl(String(body?.dataUrl || ''));
  if (!parsed) {
    return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
  }
  if (parsed.buffer.length > 8 * 1024 * 1024) {
    return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
  }

  const requestedName = sanitizeFilename(String(body?.fileName || `home-offers.${parsed.ext}`));
  const sourceExt: ImageFormat = parsed.ext === 'png' || parsed.ext === 'webp' ? parsed.ext : 'jpg';
  const savedImage = await saveUploadedImage({
    uploadDir: homeUploadDir,
    bucket: 'home',
    filePrefix: 'home-offers',
    requestedName,
    sourceExt,
    sourceBuffer: parsed.buffer,
    maxDimension: 2200,
    quality: 82,
  });

  return reply.send({ ok: true, imageUrl: savedImage.url });
});

server.post('/api/v1/admin/content/page-image', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can upload page images' });
  }

  const body = request.body as { fileName?: string; dataUrl?: string; context?: string } | undefined;
  const context = sanitizeFilename(String(body?.context || 'page')).replace(/\.+/g, '-').slice(0, 24) || 'page';
  const dataUrl = String(body?.dataUrl || '');
  let savedImage: UploadedImageResult;

  if (context === 'general-site-icon') {
    const parsedIcon = parseSiteIconDataUrl(dataUrl);
    if (!parsedIcon) {
      return reply.code(400).send({ error: 'Invalid icon format. Use ICO, PNG or SVG data URL.' });
    }
    if (parsedIcon.buffer.length > 8 * 1024 * 1024) {
      return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
    }

    const requestedName = sanitizeFilename(String(body?.fileName || `${context}.${parsedIcon.ext}`));
    savedImage = await saveRawUploadedAsset({
      uploadDir: homeUploadDir,
      bucket: 'home',
      filePrefix: context,
      requestedName,
      ext: parsedIcon.ext,
      sourceBuffer: parsedIcon.buffer,
    });
  } else {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      return reply.code(400).send({ error: 'Invalid image format. Use PNG, JPG or WEBP data URL.' });
    }
    if (parsed.buffer.length > 8 * 1024 * 1024) {
      return reply.code(400).send({ error: 'Image size cannot exceed 8MB' });
    }

    const requestedName = sanitizeFilename(String(body?.fileName || `${context}.${parsed.ext}`));
    const sourceExt: ImageFormat = parsed.ext === 'png' || parsed.ext === 'webp' ? parsed.ext : 'jpg';
    savedImage = await saveUploadedImage({
      uploadDir: homeUploadDir,
      bucket: 'home',
      filePrefix: context,
      requestedName,
      sourceExt,
      sourceBuffer: parsed.buffer,
      maxDimension: 2200,
      quality: 82,
    });
  }

  return reply.send({ ok: true, imageUrl: savedImage.url });
});

server.post('/api/v1/admin/assets/prewarm', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can prewarm assets' });
  }

  const body = request.body as { widths?: number[]; runBase?: boolean } | undefined;
  const customWidths = Array.isArray(body?.widths)
    ? body.widths
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
        .map((value) => Math.round(value))
        .filter((value) => value >= 256 && value <= assetWidthCeiling)
        .slice(0, 8)
    : [];
  const widths = customWidths.length > 0 ? customWidths : assetPrewarmWidths.length > 0 ? assetPrewarmWidths : [640, 1280, 1920];
  const runBase = body?.runBase !== false;

  const [avatars, hotels, home] = await Promise.all([
    prewarmAssetBucket('avatars', avatarUploadDir, widths, runBase),
    prewarmAssetBucket('hotels', hotelUploadDir, widths, runBase),
    prewarmAssetBucket('home', homeUploadDir, widths, runBase),
  ]);

  return reply.send({
    ok: true,
    widths,
    runBase,
    summary: { avatars, hotels, home },
  });
});

server.post('/api/v1/admin/users', async (request, reply) => {
  const currentAdmin = await getRequestAdmin(request.headers.authorization);

  if (!currentAdmin || currentAdmin.role !== 'super_admin') {
    return reply.code(403).send({ error: 'Only super_admin can create users' });
  }

  const body = request.body as { name?: string; email?: string; password?: string; role?: AdminRole };
  const name = String(body?.name || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '').trim();
  const role = body?.role;

  if (!name || !email || !password || (role !== 'moderator' && role !== 'user')) {
    return reply.code(400).send({ error: 'Valid name, email, password and role (moderator|user) are required' });
  }

  const db = await getDb();
  const admins = db.collection<AdminUser>('admins');

  try {
    const now = new Date();
    const parts = name.split(' ');
    const firstName = parts[0] || name;
    const lastName = parts.slice(1).join(' ');
    await admins.insertOne({
      _id: new ObjectId(),
      email,
      name,
      firstName,
      lastName,
      passwordHash: hashPassword(password),
      role,
      approved: true,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    return reply.code(409).send({ error: 'User could not be created. Email may already exist.' });
  }

  return reply.code(201).send({ ok: true });
});
}
