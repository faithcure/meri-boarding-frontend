import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { MongoClient, ObjectId } from 'mongodb';
import { buildCoreUtils } from './modules/coreUtils.js';
import { createContentTransforms } from './modules/contentTransforms.js';
import { createImageUtils } from './modules/imageUtils.js';
import { createMailUtils } from './modules/mailUtils.js';
import { createRuntimeServices } from './modules/runtimeServices.js';
import { registerAdminContentRoutes } from './routes/adminContentRoutes.js';
import { registerAdminHotelRoutes } from './routes/adminHotelRoutes.js';
import { registerAuthUserRoutes } from './routes/authUserRoutes.js';
import { registerPublicRoutes } from './routes/publicRoutes.js';

import {
  allowedGalleryCategories,
  allowedLocales,
  allowedSocialPlatforms,
  defaultAmenitiesContent,
  defaultContactContent,
  defaultGeneralSettingsContent,
  defaultHeaderContent,
  defaultHomeContent,
  defaultReservationContent,
  defaultServicesContent,
  homeSectionKeys,
  type AdminRole,
  type AdminUser,
  type AmenitiesCard,
  type AmenitiesCmsContent,
  type AmenitiesLayoutOption,
  type ContactCmsContent,
  type ContactDetailItem,
  type ContactSocialLink,
  type ContactSubmission,
  type ContactSubmissionStatus,
  type ContentEntry,
  type ContentLocale,
  type GeneralSettingsContent,
  type HeaderContent,
  type HomeBookingPartner,
  type HomeCmsContent,
  type HomeFaqItem,
  type HomeGalleryCategory,
  type HomeGalleryItem,
  type HomeHeroSlide,
  type HomeOfferCard,
  type HomeSectionKey,
  type HomeSectionState,
  type HomeTestimonialSlide,
  type HotelEntity,
  type HotelFact,
  type HotelGalleryImage,
  type HotelGalleryMeta,
  type HotelLocaleContent,
  type ReservationCmsContent,
  type ReservationHelpContact,
  type ReservationInquiryPurpose,
  type ServicesCmsContent,
  type ServicesHighlight,
  type ServicesStat,
  type SessionPayload,
} from './modules/contentSchemas.js';

dotenv.config();

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const mongoDbName = process.env.MONGODB_DB || 'meri_boarding';
const tokenSecret = process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_SESSION_SECRET || 'change-this-secret';
const tokenHours = Number(process.env.ADMIN_TOKEN_HOURS || 12);
const seedHotelsOnStart = String(process.env.SEED_HOTELS_ON_START || '').trim().toLowerCase() === 'true';
const defaultSmtpPort = 465;
const smtpStartTls = String(process.env.SMTP_STARTTLS || '').trim().toLowerCase() === 'true';
const contactNotifyToRaw = String(process.env.CONTACT_FORM_TO || process.env.CONTACT_NOTIFY_TO || '').trim();
const ragServiceUrl = String(process.env.RAG_SERVICE_URL || 'http://rag-service:4100').trim().replace(/\/+$/, '');
const ragRequestTimeoutMs = Number(process.env.RAG_REQUEST_TIMEOUT_MS || 10000);
const smtpHost = String(process.env.SMTP_HOST || '').trim();
const smtpPortRaw = Number(process.env.SMTP_PORT || defaultSmtpPort);
const smtpPort = Number.isFinite(smtpPortRaw) ? Math.round(smtpPortRaw) : defaultSmtpPort;
const smtpSecure = String(process.env.SMTP_SECURE || '').trim().toLowerCase() === 'true' || smtpPort === 465;
const smtpUser = String(process.env.SMTP_USER || '').trim();
const smtpPass = String(process.env.SMTP_PASS || '').trim();
const smtpFrom = String(process.env.SMTP_FROM || '').trim();

const server = Fastify({
  logger: true,
  // Gallery uploads are sent as base64 JSON payloads from admin panel.
  // Keep this above allowed 8MB decoded file size to avoid transport-level disconnects.
  bodyLimit: 12 * 1024 * 1024,
});

let mongoClient: MongoClient | null = null;
const avatarUploadDir = path.resolve(process.cwd(), 'uploads', 'avatars');
const hotelUploadDir = path.resolve(process.cwd(), 'uploads', 'hotels');
const homeUploadDir = path.resolve(process.cwd(), 'uploads', 'home');
const defaultAvatarPath = '/images/avatars/user-silhouette.svg';
const assetCacheDir = path.resolve(process.cwd(), 'uploads', '.cache');
const cwebpBinary = String(process.env.CWEBP_BIN || 'cwebp').trim() || 'cwebp';
const uploadImageQuality = Math.min(95, Math.max(55, Number(process.env.UPLOAD_IMAGE_QUALITY || 82)));
const uploadImageMaxDimension = Math.max(640, Number(process.env.UPLOAD_IMAGE_MAX_DIMENSION || 2200));
const assetImageQuality = Math.min(95, Math.max(55, Number(process.env.ASSET_IMAGE_QUALITY || 80)));
const assetWidthCeiling = Math.max(640, Number(process.env.ASSET_IMAGE_MAX_WIDTH || 2560));
const assetPrewarmOnStart = String(process.env.ASSET_PREWARM_ON_START || '').trim().toLowerCase() === 'true';
const assetPrewarmWidths = String(process.env.ASSET_PREWARM_WIDTHS || '640,1280,1920')
  .split(',')
  .map((value) => Number(String(value || '').trim()))
  .filter((value) => Number.isFinite(value))
  .map((value) => Math.round(value))
  .filter((value) => value >= 256 && value <= assetWidthCeiling)
  .slice(0, 8);

type ImageFormat = import('./modules/coreUtils.js').ImageFormat;

const coreUtils = buildCoreUtils({
  tokenSecret,
  tokenHours,
  defaultAvatarPath,
  allowedLocales,
  allowedGalleryCategories,
});

const {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  getBearerToken,
  getAdminDisplayName,
  toAvatarUrl,
  sanitizeFilename,
  toSlug,
  escapeRegex,
  parseDataUrl,
  parseSiteIconDataUrl,
  extToMime,
  parseRequestedDimension,
  parseLocale,
  parseGalleryCategory,
  sanitizeHomeGalleryCategoryKey,
  isValidBackgroundPosition,
  isValidLink,
  isValidImagePathOrUrl,
  isValidSocialUrl,
  canManageContent,
} = coreUtils;

const imageUtils = createImageUtils({
  cwebpBinary,
  uploadImageQuality,
  uploadImageMaxDimension,
  assetImageQuality,
  assetCacheDir,
  logger: server.log,
  sanitizeFilename,
});

const { supportsWebp, saveRawUploadedAsset, saveUploadedImage, getOrCreateWebpVariant, prewarmAssetBucket } = imageUtils;

async function getDb() {
  if (!mongoClient) {
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
  }
  return mongoClient.db(mongoDbName);
}

function normalizeHeaderContent(input: Partial<HeaderContent> | undefined, fallback: HeaderContent): HeaderContent {
  return {
    home: String(input?.home ?? fallback.home).trim(),
    hotels: String(input?.hotels ?? fallback.hotels).trim(),
    services: String(input?.services ?? fallback.services).trim(),
    ourServices: String(input?.ourServices ?? fallback.ourServices).trim(),
    amenities: String(input?.amenities ?? fallback.amenities).trim(),
    ourAmenities: String(input?.ourAmenities ?? fallback.ourAmenities).trim(),
    contact: String(input?.contact ?? fallback.contact).trim(),
    reservation: String(input?.reservation ?? fallback.reservation).trim(),
    flamingo: String(input?.flamingo ?? fallback.flamingo).trim(),
    europaplatz: String(input?.europaplatz ?? fallback.europaplatz).trim(),
    hildesheim: String(input?.hildesheim ?? fallback.hildesheim).trim(),
  };
}

function normalizeGeneralSettingsContent(
  input: Partial<GeneralSettingsContent> | undefined,
  fallback: GeneralSettingsContent,
): GeneralSettingsContent {
  const normalizedSocials = (Array.isArray(input?.socialLinks) ? input?.socialLinks : fallback.socialLinks)
    .map((item, index) => {
      const fallbackItem = fallback.socialLinks[index] || fallback.socialLinks[0];
      const platformRaw = String(item?.platform || fallbackItem?.platform || '').trim().toLowerCase();
      const platform = allowedSocialPlatforms.includes(platformRaw as (typeof allowedSocialPlatforms)[number])
        ? platformRaw
        : 'instagram';
      const normalizedId = String(item?.id || `${platform}-${index + 1}`)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64);

      return {
        id: normalizedId || `${platform}-${index + 1}`,
        platform,
        label: String(item?.label || fallbackItem?.label || '').trim(),
        url: String(item?.url || fallbackItem?.url || '').trim(),
        enabled: item?.enabled !== false,
        order: Number.isFinite(item?.order) ? Number(item?.order) : index + 1,
      };
    })
    .filter((item) => Boolean(item.label) && Boolean(item.url))
    .sort((a, b) => a.order - b.order)
    .slice(0, 40)
    .map((item, index) => ({ ...item, order: index + 1 }));

  const requestFormActionUrl = String(input?.formDelivery?.requestFormActionUrl ?? fallback.formDelivery.requestFormActionUrl ?? '').trim();
  const contactNotificationEmailSource = Array.isArray(input?.formDelivery?.contactNotificationEmails)
    ? input?.formDelivery?.contactNotificationEmails
    : fallback.formDelivery.contactNotificationEmails;
  const contactNotificationEmails = parseEmailList(contactNotificationEmailSource.map((item) => String(item || '')).join(',')).slice(0, 30);
  const smtpPortRaw = Number(input?.smtp?.port ?? fallback.smtp.port ?? defaultSmtpPort);
  const normalizedSmtpPort = Number.isFinite(smtpPortRaw) ? Math.round(smtpPortRaw) : defaultSmtpPort;

  return {
    siteIconUrl: String(input?.siteIconUrl ?? fallback.siteIconUrl).trim(),
    socialLinks: normalizedSocials,
    formDelivery: {
      requestFormActionUrl,
      contactNotificationEmails,
    },
    smtp: {
      host: String(input?.smtp?.host ?? fallback.smtp.host ?? '').trim(),
      port: Math.min(65535, Math.max(1, normalizedSmtpPort)),
      user: String(input?.smtp?.user ?? fallback.smtp.user ?? '').trim(),
      pass: String(input?.smtp?.pass ?? fallback.smtp.pass ?? '').trim(),
      from: String(input?.smtp?.from ?? fallback.smtp.from ?? '').trim(),
    },
  };
}


const mailUtils = createMailUtils({
  smtpHost,
  smtpPort,
  smtpSecure,
  smtpStartTls,
  smtpUser,
  smtpPass,
  smtpFrom,
});

const { parseEmailList, extractEmailsFromText, sendSmtpMail: sendSmtpMailRaw, setSmtpConfig, formatContactSubmission } = mailUtils;

const contentTransforms = createContentTransforms({
  defaultHomeContent,
  defaultServicesContent,
  defaultAmenitiesContent,
  defaultContactContent,
  defaultReservationContent,
  homeSectionKeys,
  sanitizeHomeGalleryCategoryKey,
  isValidBackgroundPosition,
  isValidLink,
  parseGalleryCategory,
});

const {
  getLocalizedGenericRoomsCards,
  normalizeHomeContent,
  validateHomeContent,
  normalizeServicesContent,
  validateServicesContent,
  normalizeAmenitiesContent,
  validateAmenitiesContent,
  normalizeContactContent,
  validateContactContent,
  normalizeReservationContent,
  validateReservationContent,
  mergeRoomsCardsWithSharedMedia,
  normalizeHotelFact,
  normalizeGalleryMeta,
  normalizeGalleryMetaMap,
  normalizeHotelLocaleContent,
} = contentTransforms;

const runtimeServices = createRuntimeServices({
  getDb,
  ObjectId,
  allowedLocales,
  defaultHeaderContent,
  defaultGeneralSettingsContent,
  defaultHomeContent,
  defaultServicesContent,
  defaultAmenitiesContent,
  defaultReservationContent,
  defaultContactContent,
  normalizeHeaderContent,
  normalizeGeneralSettingsContent,
  normalizeHomeContent,
  normalizeServicesContent,
  normalizeAmenitiesContent,
  normalizeReservationContent,
  normalizeContactContent,
  mergeRoomsCardsWithSharedMedia,
  normalizeHotelLocaleContent,
  getLocalizedGenericRoomsCards,
  parseEmailList,
  extractEmailsFromText,
  contactNotifyToRaw,
  avatarUploadDir,
  hotelUploadDir,
  homeUploadDir,
  assetCacheDir,
  getBearerToken,
  verifyToken,
});

const {
  getHeaderContent,
  getGeneralSettingsContent,
  getHomeContent,
  getServicesContent,
  getAmenitiesContent,
  getReservationContent,
  getContactContent,
  getContactSubmissionsCollection,
  resolveContactNotificationRecipients,
  ensureAdminIndexes,
  ensureChatIndexes,
  ensureContentIndexes,
  seedHeaderContents,
  seedHomeContents,
  seedServicesContents,
  seedAmenitiesContents,
  seedReservationContents,
  seedContactContents,
  seedHotels,
  ensureStorageFolders,
  getRequestAdmin,
  getLocalizedDefaultServicesContent,
  getLocalizedDefaultAmenitiesContent,
  getLocalizedDefaultReservationContent,
  getLocalizedDefaultContactContent,
} = runtimeServices;

const sendSmtpMail: typeof sendSmtpMailRaw = async (mailOptions) => {
  const generalSettings = await getGeneralSettingsContent();
  const resolvedHost = String(generalSettings?.smtp?.host || '').trim();
  const resolvedPortRaw = Number(generalSettings?.smtp?.port ?? defaultSmtpPort);
  const resolvedPort = Number.isFinite(resolvedPortRaw) ? Math.round(resolvedPortRaw) : 0;
  const resolvedUser = String(generalSettings?.smtp?.user || '').trim();
  const resolvedPass = String(generalSettings?.smtp?.pass || '').trim();
  const resolvedFrom = String(generalSettings?.smtp?.from || '').trim();
  const resolvedSecure = resolvedPort === 465;

  setSmtpConfig({
    smtpHost: resolvedHost,
    smtpPort: resolvedPort,
    smtpSecure: resolvedSecure,
    smtpStartTls,
    smtpUser: resolvedUser,
    smtpPass: resolvedPass,
    smtpFrom: resolvedFrom,
  });

  return sendSmtpMailRaw(mailOptions);
};

await server.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',').map((v) => v.trim()).filter(Boolean) || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

server.setErrorHandler((error, request, reply) => {
  const err = error as { code?: string };

  if (err.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
    return reply.code(413).send({ error: 'Request payload is too large. Please upload a smaller image.' });
  }

  request.log.error(error);
  return reply.code(500).send({ error: 'Internal server error' });
});

const routeContext = {
  server,
  ObjectId,
  ragServiceUrl,
  ragRequestTimeoutMs,
  assetWidthCeiling,
  assetPrewarmWidths,
  allowedLocales,
  allowedSocialPlatforms,
  avatarUploadDir,
  hotelUploadDir,
  homeUploadDir,
  parseLocale,
  getHeaderContent,
  getGeneralSettingsContent,
  getHomeContent,
  getServicesContent,
  getAmenitiesContent,
  getReservationContent,
  getContactContent,
  getContactSubmissionsCollection,
  resolveContactNotificationRecipients,
  sendSmtpMail,
  getDb,
  normalizeHotelLocaleContent,
  escapeRegex,
  sanitizeFilename,
  parseRequestedDimension,
  supportsWebp,
  getOrCreateWebpVariant,
  extToMime,
  verifyPassword,
  createToken,
  getAdminDisplayName,
  toAvatarUrl,
  hashPassword,
  getRequestAdmin,
  parseDataUrl,
  saveUploadedImage,
  parseGalleryCategory,
  toSlug,
  normalizeHeaderContent,
  defaultHeaderContent,
  normalizeGeneralSettingsContent,
  defaultGeneralSettingsContent,
  isValidImagePathOrUrl,
  isValidSocialUrl,
  getLocalizedDefaultServicesContent,
  normalizeServicesContent,
  validateServicesContent,
  getLocalizedDefaultAmenitiesContent,
  normalizeAmenitiesContent,
  validateAmenitiesContent,
  getLocalizedDefaultReservationContent,
  normalizeReservationContent,
  validateReservationContent,
  getLocalizedDefaultContactContent,
  normalizeContactContent,
  validateContactContent,
  canManageContent,
  formatContactSubmission,
  defaultHomeContent,
  normalizeHomeContent,
  validateHomeContent,
  mergeRoomsCardsWithSharedMedia,
  parseSiteIconDataUrl,
  saveRawUploadedAsset,
  prewarmAssetBucket,
  unlink,
  path,
};

await registerPublicRoutes(routeContext);
await registerAuthUserRoutes(routeContext);
await registerAdminHotelRoutes(routeContext);
await registerAdminContentRoutes(routeContext);

const start = async () => {
  try {
    await ensureStorageFolders();
    await ensureAdminIndexes();
    await ensureChatIndexes();
    await ensureContentIndexes();
    await seedHeaderContents();
    await seedHomeContents();
    await seedServicesContents();
    await seedAmenitiesContents();
    await seedReservationContents();
    await seedContactContents();
    if (seedHotelsOnStart) {
      await seedHotels();
      server.log.info('Default hotels seed completed (SEED_HOTELS_ON_START=true).');
    } else {
      server.log.info('Default hotels seed skipped (set SEED_HOTELS_ON_START=true to enable).');
    }
    await server.listen({ port, host });
    server.log.info(`API running on http://${host}:${port}`);
    if (assetPrewarmOnStart) {
      const widths = assetPrewarmWidths.length > 0 ? assetPrewarmWidths : [640, 1280, 1920];
      server.log.info({ widths }, 'Asset prewarm started in background (ASSET_PREWARM_ON_START=true).');
      void (async () => {
        try {
          const [avatars, hotels, home] = await Promise.all([
            prewarmAssetBucket('avatars', avatarUploadDir, widths),
            prewarmAssetBucket('hotels', hotelUploadDir, widths),
            prewarmAssetBucket('home', homeUploadDir, widths),
          ]);
          server.log.info(
            {
              widths,
              avatars,
              hotels,
              home,
            },
            'Asset prewarm completed (ASSET_PREWARM_ON_START=true).',
          );
        } catch (error) {
          server.log.warn({ err: error }, 'Asset prewarm failed');
        }
      })();
    } else {
      server.log.info('Asset prewarm skipped (set ASSET_PREWARM_ON_START=true to enable).');
    }
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

void start();
