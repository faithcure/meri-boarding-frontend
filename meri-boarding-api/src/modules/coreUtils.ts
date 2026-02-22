import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

import type { AdminUser, ContentLocale, HomeGalleryCategory, HotelGalleryImage, HomeSectionKey, HomeSectionState, SessionPayload } from './contentSchemas.js'

export type ImageFormat = 'jpg' | 'png' | 'webp'

type BuildCoreUtilsOptions = {
  tokenSecret: string
  tokenHours: number
  defaultAvatarPath: string
  allowedLocales: ContentLocale[]
  allowedGalleryCategories: HotelGalleryImage['category'][]
}

export function buildCoreUtils(options: BuildCoreUtilsOptions) {
  const signTokenPart = (value: string) => createHmac('sha256', options.tokenSecret).update(value).digest('hex')

  const hashPassword = (password: string) => {
    const salt = randomBytes(16).toString('hex')
    const hash = scryptSync(password, salt, 64).toString('hex')
    return `${salt}:${hash}`
  }

  const verifyPassword = (password: string, passwordHash: string) => {
    const [salt, storedHash] = passwordHash.split(':')
    if (!salt || !storedHash) return false

    const receivedHash = scryptSync(password, salt, 64).toString('hex')
    const expected = Buffer.from(storedHash, 'hex')
    const received = Buffer.from(receivedHash, 'hex')

    if (expected.length !== received.length) return false

    return timingSafeEqual(expected, received)
  }

  const createToken = (payload: Omit<SessionPayload, 'exp'>) => {
    const exp = Date.now() + options.tokenHours * 60 * 60 * 1000
    const encodedPayload = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url')
    const signature = signTokenPart(encodedPayload)
    return `${encodedPayload}.${signature}`
  }

  const verifyToken = (token?: string) => {
    if (!token) return null

    const [encodedPayload, signature] = token.split('.')
    if (!encodedPayload || !signature) return null

    const expectedSignature = signTokenPart(encodedPayload)
    const left = Buffer.from(expectedSignature)
    const right = Buffer.from(signature)
    if (left.length !== right.length || !timingSafeEqual(left, right)) return null

    try {
      const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload
      if (!parsed.userId || !parsed.role || !parsed.exp || parsed.exp <= Date.now()) return null
      return parsed
    } catch {
      return null
    }
  }

  const getBearerToken = (authorization?: string) => {
    if (!authorization) return null
    const [scheme, token] = authorization.split(' ')
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null
    return token
  }

  const getAdminDisplayName = (admin: AdminUser) => {
    const firstName = String(admin.firstName || '').trim()
    const lastName = String(admin.lastName || '').trim()
    const fullName = `${firstName} ${lastName}`.trim()
    if (fullName) return fullName
    return String(admin.name || '').trim() || 'Admin User'
  }

  const toAvatarUrl = (avatarPath?: string) => (avatarPath ? `/api/v1/assets/avatars/${avatarPath}` : options.defaultAvatarPath)

  const sanitizeFilename = (fileName: string) => fileName.replace(/[^a-zA-Z0-9._-]/g, '_')

  const toSlug = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const parseDataUrl = (dataUrl: string) => {
    const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i.exec(dataUrl)
    if (!match) return null
    const mime = match[1].toLowerCase()
    const base64 = match[2]
    const ext: ImageFormat = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
    return { mime, ext, buffer: Buffer.from(base64, 'base64') }
  }

  const parseSiteIconDataUrl = (dataUrl: string) => {
    const match = /^data:(image\/(?:png|svg\+xml|x-icon|vnd\.microsoft\.icon));base64,(.+)$/i.exec(dataUrl)
    if (!match) return null
    const mime = match[1].toLowerCase()
    const base64 = match[2]
    const ext: 'png' | 'svg' | 'ico' = mime.includes('svg') ? 'svg' : mime.includes('icon') ? 'ico' : 'png'
    return { mime, ext, buffer: Buffer.from(base64, 'base64') }
  }

  const extToMime = (ext: string) => {
    const normalized = String(ext || '').toLowerCase()
    if (normalized === 'png') return 'image/png'
    if (normalized === 'webp') return 'image/webp'
    if (normalized === 'svg') return 'image/svg+xml'
    if (normalized === 'ico') return 'image/x-icon'
    return 'image/jpeg'
  }

  const parseRequestedDimension = (input: unknown, min: number, max: number) => {
    const value = Number(String(input ?? '').trim())
    if (!Number.isFinite(value)) return null
    const rounded = Math.round(value)
    if (rounded < min || rounded > max) return null
    return rounded
  }

  const parseLocale = (input?: string): ContentLocale => {
    const normalized = String(input || '').trim().toLowerCase()
    return options.allowedLocales.includes(normalized as ContentLocale) ? (normalized as ContentLocale) : 'en'
  }

  const parseGalleryCategory = (input?: string): HotelGalleryImage['category'] => {
    const normalized = String(input || '').trim().toLowerCase()
    return options.allowedGalleryCategories.includes(normalized as HotelGalleryImage['category'])
      ? (normalized as HotelGalleryImage['category'])
      : 'other'
  }

  const sanitizeHomeGalleryCategoryKey = (input?: string): string => {
    const normalized = String(input || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32)
    return normalized || 'general'
  }

  const isValidBackgroundPosition = (input: string) => {
    const value = String(input || '').trim()
    if (!value || value.length > 48) return false
    const partRegex = /^(left|center|right|top|bottom|\d{1,3}%|\d{1,4}px)$/i
    const parts = value.split(/\s+/).filter(Boolean)
    if (parts.length < 1 || parts.length > 2) return false
    return parts.every(part => partRegex.test(part))
  }

  const isValidLink = (input: string) => {
    const value = String(input || '').trim()
    if (!value || value.length > 400) return false
    if (value.startsWith('/')) return true
    return /^https?:\/\//i.test(value)
  }

  const isValidImagePathOrUrl = (input: string) => {
    const value = String(input || '').trim()
    if (!value || value.length > 400) return false
    if (/\s/.test(value)) return false
    if (value.startsWith('/')) return true
    return /^https?:\/\//i.test(value)
  }

  const isValidSocialUrl = (input: string) => {
    const value = String(input || '').trim()
    if (!value || value.length > 600) return false
    if (/\s/.test(value)) return false
    return /^https?:\/\//i.test(value)
  }

  const canManageContent = (admin: AdminUser | null) => Boolean(admin && (admin.role === 'super_admin' || admin.role === 'moderator'))

  return {
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
    canManageContent
  }
}
