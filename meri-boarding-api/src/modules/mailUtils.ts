import nodemailer from 'nodemailer'

import type { ContactSubmission } from './contentSchemas.js'

type CreateMailUtilsOptions = {
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpStartTls: boolean
  smtpUser: string
  smtpPass: string
  smtpFrom: string
}

export function createMailUtils(options: CreateMailUtilsOptions) {
  let smtpConfig: CreateMailUtilsOptions = {
    smtpHost: String(options.smtpHost || '').trim(),
    smtpPort: Number(options.smtpPort || 0),
    smtpSecure: Boolean(options.smtpSecure),
    smtpStartTls: Boolean(options.smtpStartTls),
    smtpUser: String(options.smtpUser || '').trim(),
    smtpPass: String(options.smtpPass || '').trim(),
    smtpFrom: String(options.smtpFrom || '').trim()
  }

  const parseEmailList = (input: string) => {
    const values = String(input || '')
      .split(',')
      .map(item => item.trim().toLowerCase())
      .filter(Boolean)
    return Array.from(new Set(values))
  }

  const extractEmailsFromText = (input: string) => {
    const text = String(input || '')
    const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []
    const values = matches.map(item => item.trim().toLowerCase()).filter(Boolean)
    return Array.from(new Set(values))
  }

  const extractEnvelopeAddress = (input: string) => {
    const value = String(input || '').trim()
    if (!value) return ''
    const bracketMatch = /<([^>]+)>/.exec(value)
    if (bracketMatch?.[1]) return bracketMatch[1].trim()
    if (value.includes('@')) return value
    return ''
  }

  const setSmtpConfig = (nextConfig: Partial<CreateMailUtilsOptions>) => {
    const nextPortRaw = Number(nextConfig.smtpPort ?? smtpConfig.smtpPort)
    const nextPort = Number.isFinite(nextPortRaw) ? Math.round(nextPortRaw) : 0

    smtpConfig = {
      smtpHost: String(nextConfig.smtpHost ?? smtpConfig.smtpHost ?? '').trim(),
      smtpPort: nextPort,
      smtpSecure: Boolean(nextConfig.smtpSecure ?? smtpConfig.smtpSecure),
      smtpStartTls: Boolean(nextConfig.smtpStartTls ?? smtpConfig.smtpStartTls),
      smtpUser: String(nextConfig.smtpUser ?? smtpConfig.smtpUser ?? '').trim(),
      smtpPass: String(nextConfig.smtpPass ?? smtpConfig.smtpPass ?? '')
        .trim()
        .replace(/\s+/g, ''),
      smtpFrom: String(nextConfig.smtpFrom ?? smtpConfig.smtpFrom ?? '').trim()
    }
  }

  const sendSmtpMail = async (mailOptions: {
    to: string[]
    subject: string
    text: string
    html?: string
    replyTo?: string
    attachments?: Array<{
      filename: string
      content: Buffer
      cid?: string
      contentType?: string
    }>
  }) => {
    if (!smtpConfig.smtpHost || !smtpConfig.smtpPort || !smtpConfig.smtpFrom) {
      return { sent: false, error: 'SMTP config is missing (SMTP_HOST/SMTP_PORT/SMTP_FROM).' }
    }

    const fromEnvelope = extractEnvelopeAddress(smtpConfig.smtpFrom)
    if (!fromEnvelope || !fromEnvelope.includes('@')) {
      return { sent: false, error: 'SMTP_FROM must include a valid email address.' }
    }

    const recipients = mailOptions.to.map(item => extractEnvelopeAddress(item)).filter(item => item.includes('@'))
    if (recipients.length < 1) {
      return { sent: false, error: 'No valid recipient email address found.' }
    }

    if ((smtpConfig.smtpUser && !smtpConfig.smtpPass) || (!smtpConfig.smtpUser && smtpConfig.smtpPass)) {
      return { sent: false, error: 'Both SMTP_USER and SMTP_PASS must be set together.' }
    }

    try {
      const transport = nodemailer.createTransport({
        host: smtpConfig.smtpHost,
        port: smtpConfig.smtpPort,
        secure: smtpConfig.smtpSecure,
        requireTLS: !smtpConfig.smtpSecure && smtpConfig.smtpStartTls,
        auth: smtpConfig.smtpUser && smtpConfig.smtpPass ? { user: smtpConfig.smtpUser, pass: smtpConfig.smtpPass } : undefined,
        connectionTimeout: 20_000,
        greetingTimeout: 20_000,
        socketTimeout: 20_000
      })

      await transport.sendMail({
        from: smtpConfig.smtpFrom,
        to: recipients.join(', '),
        subject: String(mailOptions.subject || 'Meri Boarding Contact Submission').trim(),
        text: String(mailOptions.text || ''),
        html: mailOptions.html ? String(mailOptions.html) : undefined,
        replyTo: mailOptions.replyTo ? String(mailOptions.replyTo).trim() : undefined,
        attachments: Array.isArray(mailOptions.attachments) && mailOptions.attachments.length > 0 ? mailOptions.attachments : undefined
      })

      return { sent: true as const }
    } catch (error) {
      return { sent: false as const, error: String((error as Error)?.message || 'SMTP send failed') }
    }
  }

  const formatContactSubmission = (item: ContactSubmission) => ({
    id: String(item._id),
    name: item.name,
    email: item.email,
    phone: item.phone,
    country: String(item.country || ''),
    subject: String(item.subject || ''),
    message: item.message,
    locale: item.locale,
    sourcePage: item.sourcePage,
    status: item.status,
    mailSent: item.mailSent,
    mailError: item.mailError || '',
    userAgent: item.userAgent || '',
    ip: item.ip || '',
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    readAt: item.readAt ? item.readAt.toISOString() : ''
  })

  return {
    parseEmailList,
    extractEmailsFromText,
    setSmtpConfig,
    sendSmtpMail,
    formatContactSubmission
  }
}
