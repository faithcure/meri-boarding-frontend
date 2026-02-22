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

  const sendSmtpMail = async (mailOptions: { to: string[]; subject: string; text: string }) => {
    if (!options.smtpHost || !options.smtpPort || !options.smtpFrom) {
      return { sent: false, error: 'SMTP config is missing (SMTP_HOST/SMTP_PORT/SMTP_FROM).' }
    }

    const fromEnvelope = extractEnvelopeAddress(options.smtpFrom)
    if (!fromEnvelope || !fromEnvelope.includes('@')) {
      return { sent: false, error: 'SMTP_FROM must include a valid email address.' }
    }

    const recipients = mailOptions.to.map(item => extractEnvelopeAddress(item)).filter(item => item.includes('@'))
    if (recipients.length < 1) {
      return { sent: false, error: 'No valid recipient email address found.' }
    }

    if ((options.smtpUser && !options.smtpPass) || (!options.smtpUser && options.smtpPass)) {
      return { sent: false, error: 'Both SMTP_USER and SMTP_PASS must be set together.' }
    }

    try {
      const transport = nodemailer.createTransport({
        host: options.smtpHost,
        port: options.smtpPort,
        secure: options.smtpSecure,
        requireTLS: !options.smtpSecure && options.smtpStartTls,
        auth: options.smtpUser && options.smtpPass ? { user: options.smtpUser, pass: options.smtpPass } : undefined,
        connectionTimeout: 20_000,
        greetingTimeout: 20_000,
        socketTimeout: 20_000
      })

      await transport.sendMail({
        from: options.smtpFrom,
        to: recipients.join(', '),
        subject: String(mailOptions.subject || 'Meri Boarding Contact Submission').trim(),
        text: String(mailOptions.text || '')
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
    sendSmtpMail,
    formatContactSubmission
  }
}
