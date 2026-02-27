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

const csvEscape = (value: unknown) => {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes(',') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

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
  if (!nextContent.formDelivery || typeof nextContent.formDelivery !== 'object') {
    return reply.code(400).send({ error: 'Form delivery settings are required.' });
  }
  if (!isValidSocialUrl(String(nextContent.formDelivery.requestFormActionUrl || ''))) {
    return reply.code(400).send({ error: 'Request form action URL must start with "http(s)://".' });
  }
  if (!Array.isArray(nextContent.formDelivery.contactNotificationEmails)) {
    return reply.code(400).send({ error: 'Contact notification emails must be an array.' });
  }
  if (nextContent.formDelivery.contactNotificationEmails.length > 30) {
    return reply.code(400).send({ error: 'Contact notification email limit is 30.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const [index, email] of nextContent.formDelivery.contactNotificationEmails.entries()) {
    const value = String(email || '').trim().toLowerCase();
    if (!emailRegex.test(value)) {
      return reply.code(400).send({ error: `Contact notification email ${index + 1} is invalid.` });
    }
  }
  if (!nextContent.smtp || typeof nextContent.smtp !== 'object') {
    return reply.code(400).send({ error: 'SMTP settings are required.' });
  }
  const smtpHost = String(nextContent.smtp.host || '').trim();
  const smtpFrom = String(nextContent.smtp.from || '').trim();
  const smtpUser = String(nextContent.smtp.user || '').trim();
  const smtpPass = String(nextContent.smtp.pass || '').trim();
  const smtpPort = Number(nextContent.smtp.port || 0);
  if (!smtpHost) {
    return reply.code(400).send({ error: 'SMTP host is required.' });
  }
  if (!Number.isFinite(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    return reply.code(400).send({ error: 'SMTP port must be between 1 and 65535.' });
  }
  if (!smtpFrom || !emailRegex.test(smtpFrom.includes('<') ? String((smtpFrom.match(/<([^>]+)>/) || [])[1] || '') : smtpFrom)) {
    return reply.code(400).send({ error: 'SMTP from email is invalid.' });
  }
  if ((smtpUser && !smtpPass) || (!smtpUser && smtpPass)) {
    return reply.code(400).send({ error: 'SMTP user and password must be set together.' });
  }

  const db = await getDb();
  const contents = db.collection<ContentEntry<GeneralSettingsContent>>('content_entries');

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

server.get('/api/v1/admin/analytics/overview', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!canManageContent(admin)) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as { locale?: string; days?: string | number } | undefined;
  const locale = String(query?.locale || 'all').trim().toLowerCase();
  const days = Math.min(365, Math.max(7, Number(query?.days || 30)));
  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const daySince = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const weekSince = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthSince = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const db = await getDb();
  const events = db.collection('analytics_events');

  const localeFilter: Record<string, unknown> = {};
  if (locale === 'de' || locale === 'en' || locale === 'tr') {
    localeFilter.locale = locale;
  }

  const periodMatch: Record<string, unknown> = {
    ...localeFilter,
    createdAt: { $gte: since },
  };

  const uniqueVisitorCount = async (match: Record<string, unknown>) => {
    const rows = await events
      .aggregate([
        {
          $match: {
            ...match,
            sessionId: { $nin: [null, ''] },
          },
        },
        { $group: { _id: '$sessionId' } },
        { $count: 'count' },
      ])
      .toArray();

    return Number(rows[0]?.count || 0);
  };

  const [pageViews, clicks, visitorsDay, visitorsWeek, visitorsMonth, visitorsInPeriod] = await Promise.all([
    events.countDocuments({ ...periodMatch, eventType: 'page_view' }),
    events.countDocuments({ ...periodMatch, eventType: 'click' }),
    uniqueVisitorCount({ ...localeFilter, createdAt: { $gte: daySince } }),
    uniqueVisitorCount({ ...localeFilter, createdAt: { $gte: weekSince } }),
    uniqueVisitorCount({ ...localeFilter, createdAt: { $gte: monthSince } }),
    uniqueVisitorCount(periodMatch),
  ]);

  const [avgDurationRows, avgPagesRows, topPagesRows, pageDurationRows, topClicksRows, countryRows, dailyRows] = await Promise.all([
    events
      .aggregate([
        {
          $match: {
            ...periodMatch,
            eventType: 'page_leave',
            durationMs: { $gt: 0 },
            sessionId: { $nin: [null, ''] },
          },
        },
        { $group: { _id: '$sessionId', durationMs: { $sum: '$durationMs' } } },
        { $group: { _id: null, avgDurationMs: { $avg: '$durationMs' } } },
      ])
      .toArray(),
    events
      .aggregate([
        {
          $match: {
            ...periodMatch,
            eventType: 'page_view',
            sessionId: { $nin: [null, ''] },
          },
        },
        { $group: { _id: '$sessionId', pageViews: { $sum: 1 } } },
        { $group: { _id: null, avgPages: { $avg: '$pageViews' } } },
      ])
      .toArray(),
    events
      .aggregate([
        { $match: { ...periodMatch, eventType: 'page_view' } },
        {
          $group: {
            _id: '$pagePath',
            views: { $sum: 1 },
            visitorsSet: {
              $addToSet: {
                $cond: [{ $and: [{ $ne: ['$sessionId', null] }, { $ne: ['$sessionId', ''] }] }, '$sessionId', null],
              },
            },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 25 },
      ])
      .toArray(),
    events
      .aggregate([
        { $match: { ...periodMatch, eventType: 'page_leave', durationMs: { $gt: 0 } } },
        { $group: { _id: '$pagePath', avgDurationMs: { $avg: '$durationMs' } } },
      ])
      .toArray(),
    events
      .aggregate([
        { $match: { ...periodMatch, eventType: 'click' } },
        {
          $group: {
            _id: {
              label: '$clickLabel',
              href: '$clickHref',
              tag: '$clickTag',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 25 },
      ])
      .toArray(),
    events
      .aggregate([
        { $match: { ...periodMatch, eventType: 'page_view' } },
        {
          $group: {
            _id: '$country',
            pageViews: { $sum: 1 },
            visitorsSet: {
              $addToSet: {
                $cond: [{ $and: [{ $ne: ['$sessionId', null] }, { $ne: ['$sessionId', ''] }] }, '$sessionId', null],
              },
            },
          },
        },
        { $sort: { pageViews: -1 } },
        { $limit: 25 },
      ])
      .toArray(),
    events
      .aggregate([
        { $match: periodMatch },
        {
          $group: {
            _id: {
              $dateToString: {
                date: '$createdAt',
                format: '%Y-%m-%d',
                timezone: 'UTC',
              },
            },
            pageViews: { $sum: { $cond: [{ $eq: ['$eventType', 'page_view'] }, 1, 0] } },
            clicks: { $sum: { $cond: [{ $eq: ['$eventType', 'click'] }, 1, 0] } },
            visitorsSet: {
              $addToSet: {
                $cond: [{ $and: [{ $ne: ['$sessionId', null] }, { $ne: ['$sessionId', ''] }] }, '$sessionId', null],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 120 },
      ])
      .toArray(),
  ]);

  const avgDurationMs = Number(avgDurationRows[0]?.avgDurationMs || 0);
  const avgPagesPerVisit = Number(avgPagesRows[0]?.avgPages || 0);

  const pageDurationMap = new Map<string, number>();
  pageDurationRows.forEach((row: any) => {
    const key = String(row?._id || '/');
    const value = Number(row?.avgDurationMs || 0);
    pageDurationMap.set(key, value);
  });

  return reply.send({
    periodDays: days,
    locale,
    generatedAt: now.toISOString(),
    totals: {
      pageViews: Number(pageViews || 0),
      clicks: Number(clicks || 0),
      visitorsInPeriod: Number(visitorsInPeriod || 0),
      visitorsDaily: Number(visitorsDay || 0),
      visitorsWeekly: Number(visitorsWeek || 0),
      visitorsMonthly: Number(visitorsMonth || 0),
      avgVisitDurationSeconds: Number((avgDurationMs / 1000).toFixed(1)),
      avgPagesPerVisit: Number(avgPagesPerVisit.toFixed(2)),
    },
    topPages: topPagesRows.map((row: any) => {
      const path = String(row?._id || '/');
      const avgDurationForPath = Number(pageDurationMap.get(path) || 0);
      const visitors = Array.isArray(row?.visitorsSet)
        ? row.visitorsSet.filter((item: unknown) => typeof item === 'string' && item).length
        : 0;
      return {
        path,
        views: Number(row?.views || 0),
        visitors,
        avgDurationSeconds: Number((avgDurationForPath / 1000).toFixed(1)),
      };
    }),
    topClicks: topClicksRows.map((row: any) => ({
      label: String(row?._id?.label || '(no label)'),
      href: String(row?._id?.href || ''),
      tag: String(row?._id?.tag || ''),
      count: Number(row?.count || 0),
    })),
    countries: countryRows.map((row: any) => ({
      country: String(row?._id || 'UNKNOWN'),
      pageViews: Number(row?.pageViews || 0),
      visitors: Array.isArray(row?.visitorsSet)
        ? row.visitorsSet.filter((item: unknown) => typeof item === 'string' && item).length
        : 0,
    })),
    daily: dailyRows.map((row: any) => ({
      date: String(row?._id || ''),
      pageViews: Number(row?.pageViews || 0),
      clicks: Number(row?.clicks || 0),
      visitors: Array.isArray(row?.visitorsSet)
        ? row.visitorsSet.filter((item: unknown) => typeof item === 'string' && item).length
        : 0,
    })),
  });
});

server.get('/api/v1/admin/chat-quality', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!canManageContent(admin)) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as { locale?: string; days?: string | number } | undefined;
  const locale = String(query?.locale || 'all').trim().toLowerCase();
  const days = Math.min(90, Math.max(1, Number(query?.days || 30)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const db = await getDb();
  const sessions = db.collection('chat_sessions');
  const messages = db.collection('chat_messages');
  const events = db.collection('chat_events');

  const sessionFilter: Record<string, unknown> = { createdAt: { $gte: since } };
  const eventFilter: Record<string, unknown> = { createdAt: { $gte: since } };
  const messageFilter: Record<string, unknown> = { createdAt: { $gte: since } };
  if (locale === 'de' || locale === 'en' || locale === 'tr') {
    sessionFilter.locale = locale;
    eventFilter.locale = locale;
    messageFilter.locale = locale;
  }

  const [totalSessions, handoffRows, assistantRows, feedbackRows, topQuestionRows] = await Promise.all([
    sessions.countDocuments(sessionFilter),
    events
      .aggregate([
        { $match: { ...eventFilter, sessionId: { $ne: null }, $or: [{ intent: 'handoff' }, { event: 'chat_handoff' }] } },
        { $group: { _id: '$sessionId' } },
        { $project: { _id: 1 } },
      ])
      .toArray(),
    messages
      .aggregate([
        { $match: { ...messageFilter, role: 'assistant', sessionId: { $ne: null } } },
        { $group: { _id: '$sessionId' } },
        { $project: { _id: 1 } },
      ])
      .toArray(),
    events
      .aggregate([
        { $match: { ...eventFilter, event: 'chat_feedback', intent: { $in: ['correct', 'incorrect'] } } },
        { $group: { _id: '$intent', count: { $sum: 1 } } },
      ])
      .toArray(),
    messages
      .aggregate([
        { $match: { ...messageFilter, role: 'user' } },
        { $project: { text: { $substrCP: [{ $trim: { input: { $toLower: '$text' } } }, 0, 180] } } },
        { $project: { text: { $trim: { input: { $replaceAll: { input: '$text', find: '\n', replacement: ' ' } } } } } },
        { $match: { text: { $ne: '' } } },
        { $group: { _id: '$text', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ])
      .toArray(),
  ]);

  const handoffSessionIds = new Set(handoffRows.map((row: any) => String(row?._id || '')));
  const assistantSessionIds = new Set(assistantRows.map((row: any) => String(row?._id || '')));
  let autoResolvedSessions = 0;
  assistantSessionIds.forEach((sessionId) => {
    if (!handoffSessionIds.has(sessionId)) autoResolvedSessions += 1;
  });

  const feedbackCorrect = Number(feedbackRows.find((row: any) => row._id === 'correct')?.count || 0);
  const feedbackIncorrect = Number(feedbackRows.find((row: any) => row._id === 'incorrect')?.count || 0);

  return reply.send({
    periodDays: days,
    locale,
    totals: {
      sessions: totalSessions,
      handoffSessions: handoffSessionIds.size,
      assistantAnsweredSessions: assistantSessionIds.size,
      autoResolvedSessions,
      handoffRate: totalSessions > 0 ? Number(((handoffSessionIds.size / totalSessions) * 100).toFixed(1)) : 0,
      autoResolveRate: totalSessions > 0 ? Number(((autoResolvedSessions / totalSessions) * 100).toFixed(1)) : 0,
    },
    feedback: {
      correct: feedbackCorrect,
      incorrect: feedbackIncorrect,
      incorrectRate:
        feedbackCorrect + feedbackIncorrect > 0
          ? Number(((feedbackIncorrect / (feedbackCorrect + feedbackIncorrect)) * 100).toFixed(1))
          : 0,
    },
    topQuestions: topQuestionRows.map((row: any) => ({
      text: String(row?._id || ''),
      count: Number(row?.count || 0),
    })),
  });
});

server.get('/api/v1/admin/chat-sessions', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!canManageContent(admin)) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as
    | {
        page?: string | number;
        limit?: string | number;
        search?: string;
        locale?: string;
      }
    | undefined;

  const page = Math.max(1, Number(query?.page || 1));
  const limit = Math.min(100, Math.max(10, Number(query?.limit || 25)));
  const search = String(query?.search || '').trim().slice(0, 120);
  const locale = String(query?.locale || 'all').trim().toLowerCase();
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};

  if (locale === 'de' || locale === 'en' || locale === 'tr') {
    filter.locale = locale;
  }
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { sourcePage: regex }, { lastPreview: regex }];
  }

  const db = await getDb();
  const sessions = db.collection('chat_sessions');

  const [items, total] = await Promise.all([
    sessions.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    sessions.countDocuments(filter),
  ]);

  return reply.send({
    items: items.map((row: any) => ({
      id: row._id.toHexString(),
      name: String(row.name || ''),
      email: String(row.email || ''),
      locale: String(row.locale || 'en'),
      sourcePage: String(row.sourcePage || '/'),
      status: String(row.status || 'open'),
      messageCount: Number(row.messageCount || 0),
      lastMessageAt: row.lastMessageAt instanceof Date ? row.lastMessageAt.toISOString() : '',
      lastRole: String(row.lastRole || ''),
      lastPreview: String(row.lastPreview || ''),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : '',
    })),
    total,
    page,
    limit,
  });
});

server.get('/api/v1/admin/chat-sessions/:sessionId/messages', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!canManageContent(admin)) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const params = request.params as { sessionId?: string } | undefined;
  const sessionId = String(params?.sessionId || '').trim();
  if (!ObjectId.isValid(sessionId)) {
    return reply.code(400).send({ error: 'Invalid session id' });
  }

  const db = await getDb();
  const sessions = db.collection('chat_sessions');
  const messages = db.collection('chat_messages');
  const objectId = new ObjectId(sessionId);

  const [session, rows] = await Promise.all([
    sessions.findOne({ _id: objectId }),
    messages.find({ sessionId: objectId }).sort({ createdAt: 1 }).limit(5000).toArray(),
  ]);

  if (!session) {
    return reply.code(404).send({ error: 'Session not found' });
  }

  return reply.send({
    session: {
      id: session._id.toHexString(),
      name: String(session.name || ''),
      email: String(session.email || ''),
      locale: String(session.locale || 'en'),
      sourcePage: String(session.sourcePage || '/'),
      status: String(session.status || 'open'),
      messageCount: Number(session.messageCount || 0),
      lastMessageAt: session.lastMessageAt instanceof Date ? session.lastMessageAt.toISOString() : '',
      createdAt: session.createdAt instanceof Date ? session.createdAt.toISOString() : '',
    },
    messages: rows.map((row: any) => ({
      id: row._id.toHexString(),
      role: String(row.role || 'user'),
      text: String(row.text || ''),
      kind: String(row.kind || ''),
      model: String(row.model || ''),
      intent: String(row.intent || ''),
      locale: String(row.locale || ''),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : '',
    })),
  });
});

server.get('/api/v1/admin/chat-sessions-export.csv', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!canManageContent(admin)) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can access this route' });
  }

  const query = request.query as { search?: string; locale?: string } | undefined;
  const search = String(query?.search || '').trim().slice(0, 120);
  const locale = String(query?.locale || 'all').trim().toLowerCase();
  const filter: Record<string, unknown> = {};

  if (locale === 'de' || locale === 'en' || locale === 'tr') {
    filter.locale = locale;
  }
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { sourcePage: regex }, { lastPreview: regex }];
  }

  const db = await getDb();
  const sessions = db.collection('chat_sessions');
  const messages = db.collection('chat_messages');
  const rows = await sessions.find(filter).sort({ createdAt: -1 }).limit(50000).toArray();

  const lines = ['session_id,name,email,locale,source_page,status,message_count,last_message_at,created_at,messages'];

  for (const session of rows) {
    const sessionId = session._id.toHexString();
    const msgs = await messages.find({ sessionId: session._id }).sort({ createdAt: 1 }).limit(5000).toArray();
    const messageText = msgs
      .map((msg: any) => `[${msg.createdAt instanceof Date ? msg.createdAt.toISOString() : ''}] ${String(msg.role || '')}: ${String(msg.text || '')}`)
      .join('\n');

    lines.push(
      [
        csvEscape(sessionId),
        csvEscape(String(session.name || '')),
        csvEscape(String(session.email || '')),
        csvEscape(String(session.locale || '')),
        csvEscape(String(session.sourcePage || '')),
        csvEscape(String(session.status || 'open')),
        csvEscape(Number(session.messageCount || 0)),
        csvEscape(session.lastMessageAt instanceof Date ? session.lastMessageAt.toISOString() : ''),
        csvEscape(session.createdAt instanceof Date ? session.createdAt.toISOString() : ''),
        csvEscape(messageText),
      ].join(','),
    );
  }

  const csv = lines.join('\n');
  reply.header('Content-Type', 'text/csv; charset=utf-8');
  reply.header('Content-Disposition', `attachment; filename=\"chat_sessions_${new Date().toISOString().slice(0, 10)}.csv\"`);
  return reply.send(csv);
});

server.delete('/api/v1/admin/chat-sessions/:sessionId', async (request, reply) => {
  const admin = await getRequestAdmin(request.headers.authorization);
  if (!canManageContent(admin)) {
    return reply.code(403).send({ error: 'Only super_admin or moderator can delete this route' });
  }

  const params = request.params as { sessionId?: string } | undefined;
  const sessionId = String(params?.sessionId || '').trim();
  if (!ObjectId.isValid(sessionId)) {
    return reply.code(400).send({ error: 'Invalid session id' });
  }

  const db = await getDb();
  const sessions = db.collection('chat_sessions');
  const messages = db.collection('chat_messages');
  const events = db.collection('chat_events');
  const objectId = new ObjectId(sessionId);

  const deleteSessionResult = await sessions.deleteOne({ _id: objectId });
  if (!deleteSessionResult.deletedCount) {
    return reply.code(404).send({ error: 'Session not found' });
  }

  await Promise.all([
    messages.deleteMany({ sessionId: objectId }),
    events.deleteMany({ sessionId: objectId }),
  ]);

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

  // Keep home video CTA shared for all locales.
  if (body?.content?.videoCta) {
    for (const localeKey of allowedLocales) {
      if (localeKey === locale) continue;
      const row = await contents.findOne({ key: 'page.home', locale: localeKey });
      const current = row ? normalizeHomeContent(row.value, defaultHomeContent) : defaultHomeContent;
      const patched = normalizeHomeContent(
        {
          ...current,
          videoCta: {
            ...current.videoCta,
            videoUrl: nextContent.videoCta.videoUrl,
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

  // Keep booking partner data shared for all locales.
  const hasBookingPartnersPayload = Array.isArray(body?.content?.hero?.bookingPartners);
  const hasBookingPartnersVisibilityPayload =
    typeof body?.content?.hero?.bookingPartnersVisibility === 'object' && body?.content?.hero?.bookingPartnersVisibility !== null;
  if (hasBookingPartnersPayload || hasBookingPartnersVisibilityPayload) {
    for (const localeKey of allowedLocales) {
      if (localeKey === locale) continue;
      const row = await contents.findOne({ key: 'page.home', locale: localeKey });
      const current = row ? normalizeHomeContent(row.value, defaultHomeContent) : defaultHomeContent;
      const patched = normalizeHomeContent(
        {
          ...current,
          hero: {
            ...current.hero,
            ...(hasBookingPartnersPayload ? { bookingPartners: nextContent.hero.bookingPartners } : {}),
            ...(hasBookingPartnersVisibilityPayload ? { bookingPartnersVisibility: nextContent.hero.bookingPartnersVisibility } : {}),
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
