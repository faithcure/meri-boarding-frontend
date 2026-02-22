import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { ImageFormat } from './coreUtils.js'

type AssetBucket = 'avatars' | 'hotels' | 'home'
type ImageDimensions = { width: number; height: number }
type UploadedImageResult = { fileName: string; url: string; optimized: boolean }

type SaveUploadedImageOptions = {
  uploadDir: string
  bucket: AssetBucket
  filePrefix: string
  requestedName: string
  sourceExt: ImageFormat
  sourceBuffer: Buffer
  maxDimension?: number
  quality?: number
}

type SaveRawUploadedAssetOptions = {
  uploadDir: string
  bucket: AssetBucket
  filePrefix: string
  requestedName: string
  ext: 'png' | 'svg' | 'ico'
  sourceBuffer: Buffer
}

type AssetVariantOptions = {
  bucket: AssetBucket
  sourceFilePath: string
  sourceFileName: string
  sourceSize: number
  sourceMtimeMs: number
  width?: number | null
  quality?: number | null
}

type CreateImageUtilsOptions = {
  cwebpBinary: string
  uploadImageQuality: number
  uploadImageMaxDimension: number
  assetImageQuality: number
  assetCacheDir: string
  logger: { warn: (payload: unknown, msg: string) => void }
  sanitizeFilename: (fileName: string) => string
}

export function createImageUtils(options: CreateImageUtilsOptions) {
  const imageVariantInFlight = new Map<string, Promise<boolean>>()

  const sanitizeStem = (input: string, fallback = 'image') => {
    const stem = options
      .sanitizeFilename(String(input || '').trim())
      .replace(/\.+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    return stem || fallback
  }

  const detectImageFormatFromBuffer = (buffer: Buffer): ImageFormat | null => {
    if (buffer.length < 12) return null
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpg'
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png'
    if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp'
    return null
  }

  const parsePngDimensions = (buffer: Buffer): ImageDimensions | null => {
    if (buffer.length < 24) return null
    if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') return null
    const width = buffer.readUInt32BE(16)
    const height = buffer.readUInt32BE(20)
    if (!width || !height) return null
    return { width, height }
  }

  const parseJpegDimensions = (buffer: Buffer): ImageDimensions | null => {
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null
    let offset = 2
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1
        continue
      }
      let marker = buffer[offset + 1]
      while (marker === 0xff) {
        offset += 1
        marker = buffer[offset + 1]
      }
      offset += 2
      if (marker === 0xd8 || marker === 0xd9) continue
      if (offset + 2 > buffer.length) break
      const segmentLength = buffer.readUInt16BE(offset)
      if (segmentLength < 2 || offset + segmentLength > buffer.length) break
      const isSofMarker =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      if (isSofMarker && offset + 7 < buffer.length) {
        const height = buffer.readUInt16BE(offset + 3)
        const width = buffer.readUInt16BE(offset + 5)
        if (width > 0 && height > 0) return { width, height }
      }
      offset += segmentLength
    }
    return null
  }

  const parseWebpDimensions = (buffer: Buffer): ImageDimensions | null => {
    if (buffer.length < 30) return null
    if (buffer.subarray(0, 4).toString('ascii') !== 'RIFF' || buffer.subarray(8, 12).toString('ascii') !== 'WEBP') return null

    let offset = 12
    while (offset + 8 <= buffer.length) {
      const chunkType = buffer.subarray(offset, offset + 4).toString('ascii')
      const chunkSize = buffer.readUInt32LE(offset + 4)
      const chunkStart = offset + 8
      if (chunkStart + chunkSize > buffer.length) break

      if (chunkType === 'VP8X' && chunkSize >= 10) {
        const width = 1 + buffer.readUIntLE(chunkStart + 4, 3)
        const height = 1 + buffer.readUIntLE(chunkStart + 7, 3)
        if (width > 0 && height > 0) return { width, height }
      }

      if (chunkType === 'VP8 ' && chunkSize >= 10) {
        const signature = buffer.readUIntLE(chunkStart + 3, 3)
        if (signature === 0x2a019d) {
          const width = buffer.readUInt16LE(chunkStart + 6) & 0x3fff
          const height = buffer.readUInt16LE(chunkStart + 8) & 0x3fff
          if (width > 0 && height > 0) return { width, height }
        }
      }

      if (chunkType === 'VP8L' && chunkSize >= 5 && buffer[chunkStart] === 0x2f) {
        const b1 = buffer[chunkStart + 1]
        const b2 = buffer[chunkStart + 2]
        const b3 = buffer[chunkStart + 3]
        const b4 = buffer[chunkStart + 4]
        const width = 1 + (b1 | ((b2 & 0x3f) << 8))
        const height = 1 + ((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10))
        if (width > 0 && height > 0) return { width, height }
      }

      offset = chunkStart + chunkSize + (chunkSize % 2)
    }
    return null
  }

  const getImageDimensions = (buffer: Buffer): ImageDimensions | null => {
    const format = detectImageFormatFromBuffer(buffer)
    if (format === 'png') return parsePngDimensions(buffer)
    if (format === 'jpg') return parseJpegDimensions(buffer)
    if (format === 'webp') return parseWebpDimensions(buffer)
    return null
  }

  const constrainByMaxDimension = (dimensions: ImageDimensions, maxDimension: number): ImageDimensions => {
    const maxSide = Math.max(dimensions.width, dimensions.height)
    if (!maxSide || maxSide <= maxDimension) return dimensions
    const ratio = maxDimension / maxSide
    return {
      width: Math.max(1, Math.round(dimensions.width * ratio)),
      height: Math.max(1, Math.round(dimensions.height * ratio))
    }
  }

  const constrainByTargetWidth = (dimensions: ImageDimensions, targetWidth: number): ImageDimensions | null => {
    if (!dimensions.width || !dimensions.height || targetWidth <= 0) return null
    if (dimensions.width <= targetWidth) return null
    const ratio = targetWidth / dimensions.width
    return { width: targetWidth, height: Math.max(1, Math.round(dimensions.height * ratio)) }
  }

  const supportsWebp = (acceptHeader?: string) => /\bimage\/webp\b/i.test(String(acceptHeader || ''))

  const runCwebp = async (inputPath: string, outputPath: string, quality: number, resize?: ImageDimensions | null): Promise<boolean> => {
    const args = ['-quiet', '-mt', '-q', String(Math.round(Math.min(95, Math.max(55, quality))))]
    if (resize?.width && resize?.height) {
      args.push('-resize', String(resize.width), String(resize.height))
    }
    args.push(inputPath, '-o', outputPath)

    return await new Promise(resolve => {
      const child = spawn(options.cwebpBinary, args, { stdio: 'ignore' })
      child.once('error', () => resolve(false))
      child.once('close', code => resolve(code === 0))
    })
  }

  const saveRawUploadedAsset = async (saveOptions: SaveRawUploadedAssetOptions): Promise<UploadedImageResult> => {
    const prefix = sanitizeStem(saveOptions.filePrefix, 'asset')
    const stem = sanitizeStem(path.parse(saveOptions.requestedName).name, 'image')
    const nonce = `${Date.now()}-${randomBytes(4).toString('hex')}`
    const baseName = `${prefix}-${nonce}-${stem}`.replace(/-+/g, '-')
    const outputFileName = `${baseName}.${saveOptions.ext}`
    await writeFile(path.join(saveOptions.uploadDir, outputFileName), saveOptions.sourceBuffer)
    return {
      fileName: outputFileName,
      url: `/api/v1/assets/${saveOptions.bucket}/${outputFileName}`,
      optimized: false
    }
  }

  const saveUploadedImage = async (saveOptions: SaveUploadedImageOptions): Promise<UploadedImageResult> => {
    const maxDimension = Math.max(640, Number(saveOptions.maxDimension || options.uploadImageMaxDimension))
    const quality = Math.round(Math.min(95, Math.max(55, Number(saveOptions.quality || options.uploadImageQuality))))
    const sourceExt: ImageFormat = saveOptions.sourceExt === 'png' || saveOptions.sourceExt === 'webp' ? saveOptions.sourceExt : 'jpg'
    const prefix = sanitizeStem(saveOptions.filePrefix, 'asset')
    const stem = sanitizeStem(path.parse(saveOptions.requestedName).name, 'image')
    const nonce = `${Date.now()}-${randomBytes(4).toString('hex')}`
    const baseName = `${prefix}-${nonce}-${stem}`.replace(/-+/g, '-')
    const tempInputPath = path.join(saveOptions.uploadDir, `.tmp-${baseName}.${sourceExt}`)
    const outputFileName = `${baseName}.webp`
    const outputPath = path.join(saveOptions.uploadDir, outputFileName)

    await writeFile(tempInputPath, saveOptions.sourceBuffer)
    let optimized = false
    try {
      const dimensions = getImageDimensions(saveOptions.sourceBuffer)
      const resize = dimensions ? constrainByMaxDimension(dimensions, maxDimension) : null
      const shouldResize = resize && dimensions ? resize.width !== dimensions.width || resize.height !== dimensions.height : false
      optimized = await runCwebp(tempInputPath, outputPath, quality, shouldResize ? resize : null)
    } finally {
      await unlink(tempInputPath).catch(() => undefined)
    }

    if (optimized) {
      return {
        fileName: outputFileName,
        url: `/api/v1/assets/${saveOptions.bucket}/${outputFileName}`,
        optimized: true
      }
    }

    const fallbackFileName = `${baseName}.${sourceExt}`
    await writeFile(path.join(saveOptions.uploadDir, fallbackFileName), saveOptions.sourceBuffer)
    return {
      fileName: fallbackFileName,
      url: `/api/v1/assets/${saveOptions.bucket}/${fallbackFileName}`,
      optimized: false
    }
  }

  const getOrCreateWebpVariant = async (variantOptions: AssetVariantOptions): Promise<string | null> => {
    const cacheBucketDir = path.join(options.assetCacheDir, variantOptions.bucket)
    await mkdir(cacheBucketDir, { recursive: true })

    const width = variantOptions.width && Number.isFinite(variantOptions.width) ? Math.round(variantOptions.width) : 0
    const quality = Math.round(
      Math.min(95, Math.max(55, Number(variantOptions.quality && Number.isFinite(variantOptions.quality) ? variantOptions.quality : options.assetImageQuality)))
    )
    const sourceStem = sanitizeStem(path.parse(variantOptions.sourceFileName).name, 'asset')
    const variantName = `${sourceStem}-${Math.round(variantOptions.sourceMtimeMs)}-${variantOptions.sourceSize}-w${width}-q${quality}.webp`
    const variantPath = path.join(cacheBucketDir, variantName)

    try {
      await stat(variantPath)
      return variantPath
    } catch {}

    const jobKey = `${variantOptions.bucket}:${variantName}`
    let pending = imageVariantInFlight.get(jobKey)

    if (!pending) {
      pending = (async () => {
        const tempOutputPath = `${variantPath}.tmp-${randomBytes(4).toString('hex')}`
        try {
          let resize: ImageDimensions | null = null
          if (width > 0) {
            const bytes = await readFile(variantOptions.sourceFilePath)
            const dimensions = getImageDimensions(bytes)
            resize = dimensions ? constrainByTargetWidth(dimensions, width) : null
          }
          const generated = await runCwebp(variantOptions.sourceFilePath, tempOutputPath, quality, resize)
          if (!generated) return false
          await rename(tempOutputPath, variantPath)
          return true
        } catch (error) {
          options.logger.warn({ err: error }, 'Could not generate cached image variant')
          await unlink(tempOutputPath).catch(() => undefined)
          return false
        }
      })().finally(() => {
        imageVariantInFlight.delete(jobKey)
      })
      imageVariantInFlight.set(jobKey, pending)
    }

    const ok = await pending
    return ok ? variantPath : null
  }

  const prewarmAssetBucket = async (
    bucket: AssetBucket,
    uploadDir: string,
    widths: number[],
    includeBase = true
  ): Promise<{ scanned: number; generated: number }> => {
    let scanned = 0
    let generated = 0
    const entries = await readdir(uploadDir, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (!entry.isFile()) continue
      if (entry.name.startsWith('.')) continue
      const ext = path.extname(entry.name).toLowerCase().replace('.', '')
      if (ext !== 'jpg' && ext !== 'jpeg' && ext !== 'png' && ext !== 'webp') continue
      const sourcePath = path.join(uploadDir, entry.name)
      const sourceStat = await stat(sourcePath).catch(() => null)
      if (!sourceStat) continue
      scanned += 1

      if (includeBase) {
        const baseVariant = await getOrCreateWebpVariant({
          bucket,
          sourceFilePath: sourcePath,
          sourceFileName: entry.name,
          sourceSize: sourceStat.size,
          sourceMtimeMs: sourceStat.mtimeMs,
          width: null,
          quality: options.assetImageQuality
        })
        if (baseVariant) generated += 1
      }

      for (const width of widths) {
        const variant = await getOrCreateWebpVariant({
          bucket,
          sourceFilePath: sourcePath,
          sourceFileName: entry.name,
          sourceSize: sourceStat.size,
          sourceMtimeMs: sourceStat.mtimeMs,
          width,
          quality: options.assetImageQuality
        })
        if (variant) generated += 1
      }
    }
    return { scanned, generated }
  }

  return {
    supportsWebp,
    saveRawUploadedAsset,
    saveUploadedImage,
    getOrCreateWebpVariant,
    prewarmAssetBucket
  }
}
