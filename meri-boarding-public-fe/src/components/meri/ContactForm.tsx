'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'

import type { Locale } from '@/i18n/getLocale'
import { getMessages } from '@/i18n/messages'
import { localePath } from '@/i18n/localePath'
import type { ContactResolvedContent } from '@/lib/contactContentApi'

type ContactFormProps = {
  locale?: Locale
  content?: ContactResolvedContent['form']
}

type ContactField = 'name' | 'email' | 'phone' | 'country' | 'subject' | 'message'

type ContactFormValues = Record<ContactField, string>

type ContactFormErrors = Partial<Record<ContactField, string>>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^[0-9+()\-\s]{7,}$/

export default function ContactForm({ locale: localeProp, content }: ContactFormProps = {}) {
  const locale = localeProp ?? 'de'
  const fallback = getMessages(locale).contactForm
  const t = useMemo(
    () => ({
      name: String(content?.name || fallback.name || ''),
      email: String(content?.email || fallback.email || ''),
      phone: String(content?.phone || fallback.phone || ''),
      message: String(content?.message || fallback.message || ''),
      send: String(content?.send || fallback.send || ''),
      success: String(content?.success || fallback.success || ''),
      error: String(content?.error || fallback.error || ''),
      namePlaceholder: String(content?.namePlaceholder || fallback.namePlaceholder || ''),
      emailPlaceholder: String(content?.emailPlaceholder || fallback.emailPlaceholder || ''),
      phonePlaceholder: String(content?.phonePlaceholder || fallback.phonePlaceholder || ''),
      messagePlaceholder: String(content?.messagePlaceholder || fallback.messagePlaceholder || '')
    }),
    [content, fallback]
  )
  const ui = useMemo(() => {
    if (locale === 'tr') {
      return {
        sending: 'Gönderiliyor...',
        validationSummary: 'Lütfen işaretli alanları kontrol edin.',
        modalTitle: 'Talebiniz alındı',
        modalBody: 'Ekibimiz en kısa sürede sizinle iletişime geçecek.',
        nameRequired: 'Lütfen adınızı girin.',
        emailInvalid: 'Lütfen geçerli bir e-posta girin.',
        phoneInvalid: 'Lütfen geçerli bir telefon girin.',
        countryRequired: 'Lütfen ülke seçin.',
        subjectRequired: 'Lütfen başvuru konusu seçin.',
        messageRequired: 'Lütfen mesajınızı yazın.',
        countryLabel: 'Ülke',
        countryPlaceholder: 'Ülke seçin',
        subjectLabel: 'Başvuru Konusu',
        subjectPlaceholder: 'Konu seçin',
        policyRequired: 'Lütfen gizlilik sözleşmesini onaylayın.',
        policyText: '* Bu formu göndererek, verilerinizin talebinizi işlemek için kullanılmasını kabul edersiniz. Veri koruma bilgilerine ',
        policyLinkText: 'buradan',
        modalClose: 'Kapat',
        assistantNote: 'Dilerseniz AI asistanımız Meri size hızlıca yardımcı olabilir.'
      }
    }

    if (locale === 'en') {
      return {
        sending: 'Sending...',
        validationSummary: 'Please check the highlighted fields.',
        modalTitle: 'Your request has been received',
        modalBody: 'Our team will contact you shortly.',
        nameRequired: 'Please enter your name.',
        emailInvalid: 'Please enter a valid email.',
        phoneInvalid: 'Please enter a valid phone number.',
        countryRequired: 'Please select your country.',
        subjectRequired: 'Please select an inquiry topic.',
        messageRequired: 'Please enter your message.',
        countryLabel: 'Country',
        countryPlaceholder: 'Select country',
        subjectLabel: 'Inquiry Topic',
        subjectPlaceholder: 'Select topic',
        policyRequired: 'Please accept the privacy policy.',
        policyText: '* By submitting this form, you agree that we may use your data to process your request. You can find data protection information ',
        policyLinkText: 'here',
        modalClose: 'Close',
        assistantNote: 'If you prefer, our AI assistant Meri can help you right away.'
      }
    }

    return {
      sending: 'Wird gesendet...',
      validationSummary: 'Bitte prüfen Sie die markierten Felder.',
      modalTitle: 'Ihre Anfrage wurde erhalten',
      modalBody: 'Unser Team wird sich in Kürze bei Ihnen melden.',
      nameRequired: 'Bitte geben Sie Ihren Namen ein.',
      emailInvalid: 'Bitte geben Sie eine gültige E-Mail ein.',
      phoneInvalid: 'Bitte geben Sie eine gültige Telefonnummer ein.',
      countryRequired: 'Bitte wählen Sie ein Land aus.',
      subjectRequired: 'Bitte wählen Sie ein Anliegen aus.',
      messageRequired: 'Bitte geben Sie Ihre Nachricht ein.',
      countryLabel: 'Land',
      countryPlaceholder: 'Land auswählen',
      subjectLabel: 'Anliegen',
      subjectPlaceholder: 'Anliegen auswählen',
      policyRequired: 'Bitte akzeptieren Sie die Datenschutzerklärung.',
      policyText: '* Mit dem Absenden dieses Formulars stimmen Sie zu, dass wir Ihre Daten zur Bearbeitung Ihrer Anfrage verwenden dürfen. Informationen zum Datenschutz finden Sie ',
      policyLinkText: 'hier',
      modalClose: 'Schließen',
      assistantNote: 'Wenn Sie möchten, kann unser KI-Assistent Meri Ihnen sofort helfen.'
    }
  }, [locale])
  const countryOptions = useMemo(() => {
    if (locale === 'tr') {
      return [
        { value: 'DE', label: 'Almanya' },
        { value: 'TR', label: 'Türkiye' },
        { value: 'AT', label: 'Avusturya' },
        { value: 'CH', label: 'İsviçre' },
        { value: 'OTHER', label: 'Diğer' }
      ]
    }

    if (locale === 'en') {
      return [
        { value: 'DE', label: 'Germany' },
        { value: 'TR', label: 'Turkey' },
        { value: 'AT', label: 'Austria' },
        { value: 'CH', label: 'Switzerland' },
        { value: 'OTHER', label: 'Other' }
      ]
    }

    return [
      { value: 'DE', label: 'Deutschland' },
      { value: 'TR', label: 'Turkei' },
      { value: 'AT', label: 'Osterreich' },
      { value: 'CH', label: 'Schweiz' },
      { value: 'OTHER', label: 'Andere' }
    ]
  }, [locale])
  const subjectOptions = useMemo(() => {
    if (locale === 'tr') {
      return [
        { value: 'reservation', label: 'Rezervasyon Talebi' },
        { value: 'long_stay', label: 'Uzun Konaklama' },
        { value: 'business', label: 'Kurumsal / İş Konaklaması' },
        { value: 'general', label: 'Genel Bilgi' },
        { value: 'support', label: 'Destek' }
      ]
    }

    if (locale === 'en') {
      return [
        { value: 'reservation', label: 'Reservation Request' },
        { value: 'long_stay', label: 'Long-term Stay' },
        { value: 'business', label: 'Corporate / Business Stay' },
        { value: 'general', label: 'General Information' },
        { value: 'support', label: 'Support' }
      ]
    }

    return [
      { value: 'reservation', label: 'Reservierungsanfrage' },
      { value: 'long_stay', label: 'Langzeitaufenthalt' },
      { value: 'business', label: 'Firmen- / Geschaftsaufenthalt' },
      { value: 'general', label: 'Allgemeine Information' },
      { value: 'support', label: 'Support' }
    ]
  }, [locale])

  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl = configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost')
    ? ''
    : configuredApiBaseUrl
  const [submitting, setSubmitting] = useState(false)
  const [formValues, setFormValues] = useState<ContactFormValues>({
    name: '',
    email: '',
    phone: '',
    country: '',
    subject: '',
    message: ''
  })
  const [fieldErrors, setFieldErrors] = useState<ContactFormErrors>({})
  const [touchedFields, setTouchedFields] = useState<Partial<Record<ContactField, boolean>>>({})
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [policyError, setPolicyError] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const privacyHref = localePath(locale, '/privacy')

  const validateField = (field: ContactField, value: string) => {
    const trimmedValue = value.trim()

    if (field === 'name') {
      return trimmedValue.length < 2 ? ui.nameRequired : ''
    }
    if (field === 'email') {
      return !emailPattern.test(trimmedValue) ? ui.emailInvalid : ''
    }
    if (field === 'phone') {
      return !phonePattern.test(trimmedValue) ? ui.phoneInvalid : ''
    }
    if (field === 'country') {
      return !trimmedValue ? ui.countryRequired : ''
    }
    if (field === 'subject') {
      return !trimmedValue ? ui.subjectRequired : ''
    }
    return trimmedValue.length < 3 ? ui.messageRequired : ''
  }

  const validateForm = (values: ContactFormValues): ContactFormErrors => {
    const nextErrors: ContactFormErrors = {}
    ;(['name', 'email', 'phone', 'country', 'subject', 'message'] as ContactField[]).forEach(field => {
      const error = validateField(field, values[field])
      if (error) nextErrors[field] = error
    })
    return nextErrors
  }

  const handleFieldChange = (field: ContactField, value: string) => {
    const nextValues = { ...formValues, [field]: value }
    setFormValues(nextValues)

    if (touchedFields[field] || hasAttemptedSubmit) {
      const nextError = validateField(field, value)
      setFieldErrors(previous => {
        if (!nextError && !previous[field]) return previous
        const nextErrors = { ...previous }
        if (nextError) {
          nextErrors[field] = nextError
        } else {
          delete nextErrors[field]
        }
        return nextErrors
      })
    }
  }

  const handleFieldBlur = (field: ContactField) => {
    setTouchedFields(previous => ({ ...previous, [field]: true }))
    const nextError = validateField(field, formValues[field])
    setFieldErrors(previous => {
      if (!nextError && !previous[field]) return previous
      const nextErrors = { ...previous }
      if (nextError) {
        nextErrors[field] = nextError
      } else {
        delete nextErrors[field]
      }
      return nextErrors
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    setHasAttemptedSubmit(true)
    setTouchedFields({ name: true, email: true, phone: true, country: true, subject: true, message: true })
    const nextErrors = validateForm(formValues)
    setFieldErrors(nextErrors)
    if (!policyAccepted) {
      setPolicyError(ui.policyRequired)
      setSuccessMessage('')
      setErrorMessage(ui.validationSummary)
      return
    }
    setPolicyError('')
    if (Object.keys(nextErrors).length > 0) {
      setSuccessMessage('')
      setErrorMessage(ui.validationSummary)
      return
    }

    setSubmitting(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/public/forms/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          sourcePage: typeof window !== 'undefined' ? window.location.pathname : '/contact',
          name: formValues.name.trim(),
          email: formValues.email.trim(),
          phone: formValues.phone.trim(),
          country: formValues.country.trim(),
          subject: String(subjectOptions.find(item => item.value === formValues.subject)?.label || formValues.subject).trim(),
          message: formValues.message.trim()
        })
      })

      const data = await response.json().catch(() => ({} as { error?: string }))

      if (!response.ok) {
        setErrorMessage(String(data?.error || t.error || 'Form gönderilemedi.'))
        return
      }

      setFormValues({
        name: '',
        email: '',
        phone: '',
        country: '',
        subject: '',
        message: ''
      })
      setTouchedFields({})
      setFieldErrors({})
      setHasAttemptedSubmit(false)
      setSuccessMessage(t.success || 'Message received.')
      setShowSuccessModal(true)
      setPolicyAccepted(false)
      setPolicyError('')
    } catch {
      setErrorMessage(t.error || 'Form gönderilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='col-lg-6'>
      <div className='bg-color-op-1 rounded-1 p-40 relative'>
        <form
          name='contactForm'
          id='contact_form'
          method='post'
          action='#'
          noValidate
          onSubmit={event => void handleSubmit(event)}
        >
          <div className='row g-4'>
            <div className='col-md-6'>
              <div className='modern-contact-field'>
                <input
                  type='text'
                  name='name'
                  id='name'
                  className={`bg-white form-control contact-form-control modern-contact-input${fieldErrors.name ? ' contact-form-control-invalid' : ''}`}
                  placeholder=' '
                  value={formValues.name}
                  onChange={event => handleFieldChange('name', event.target.value)}
                  onBlur={() => handleFieldBlur('name')}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'contact_name_error' : undefined}
                  required
                />
                <label htmlFor='name' className='modern-contact-label'>
                  {t.name}
                </label>
              </div>
              {fieldErrors.name && (touchedFields.name || hasAttemptedSubmit) ? (
                <div id='contact_name_error' className='contact-field-error'>
                  {fieldErrors.name}
                </div>
              ) : null}
            </div>

            <div className='col-md-6'>
              <div className='modern-contact-field'>
                <input
                  type='email'
                  name='email'
                  id='email'
                  className={`bg-white form-control contact-form-control modern-contact-input${fieldErrors.email ? ' contact-form-control-invalid' : ''}`}
                  placeholder=' '
                  value={formValues.email}
                  onChange={event => handleFieldChange('email', event.target.value)}
                  onBlur={() => handleFieldBlur('email')}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'contact_email_error' : undefined}
                  required
                />
                <label htmlFor='email' className='modern-contact-label'>
                  {t.email}
                </label>
              </div>
              {fieldErrors.email && (touchedFields.email || hasAttemptedSubmit) ? (
                <div id='contact_email_error' className='contact-field-error'>
                  {fieldErrors.email}
                </div>
              ) : null}
            </div>

            <div className='col-md-12'>
              <div className='modern-contact-field'>
                <input
                  type='text'
                  name='phone'
                  id='phone'
                  className={`bg-white form-control contact-form-control modern-contact-input${fieldErrors.phone ? ' contact-form-control-invalid' : ''}`}
                  placeholder=' '
                  value={formValues.phone}
                  onChange={event => handleFieldChange('phone', event.target.value)}
                  onBlur={() => handleFieldBlur('phone')}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={fieldErrors.phone ? 'contact_phone_error' : undefined}
                  required
                />
                <label htmlFor='phone' className='modern-contact-label'>
                  {t.phone}
                </label>
              </div>
              {fieldErrors.phone && (touchedFields.phone || hasAttemptedSubmit) ? (
                <div id='contact_phone_error' className='contact-field-error'>
                  {fieldErrors.phone}
                </div>
              ) : null}
            </div>

            <div className='col-md-6'>
              <div className='modern-contact-field select-field'>
                <select
                  name='country'
                  id='country'
                  className={`bg-white form-control contact-form-control modern-contact-input${fieldErrors.country ? ' contact-form-control-invalid' : ''}`}
                  value={formValues.country}
                  onChange={event => handleFieldChange('country', event.target.value)}
                  onBlur={() => handleFieldBlur('country')}
                  aria-invalid={Boolean(fieldErrors.country)}
                  aria-describedby={fieldErrors.country ? 'contact_country_error' : undefined}
                  required
                >
                  <option value=''>{ui.countryPlaceholder}</option>
                  {countryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label htmlFor='country' className='modern-contact-label'>
                  {ui.countryLabel}
                </label>
              </div>
              {fieldErrors.country && (touchedFields.country || hasAttemptedSubmit) ? (
                <div id='contact_country_error' className='contact-field-error'>
                  {fieldErrors.country}
                </div>
              ) : null}
            </div>

            <div className='col-md-6'>
              <div className='modern-contact-field select-field'>
                <select
                  name='subject'
                  id='subject'
                  className={`bg-white form-control contact-form-control modern-contact-input${fieldErrors.subject ? ' contact-form-control-invalid' : ''}`}
                  value={formValues.subject}
                  onChange={event => handleFieldChange('subject', event.target.value)}
                  onBlur={() => handleFieldBlur('subject')}
                  aria-invalid={Boolean(fieldErrors.subject)}
                  aria-describedby={fieldErrors.subject ? 'contact_subject_error' : undefined}
                  required
                >
                  <option value=''>{ui.subjectPlaceholder}</option>
                  {subjectOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label htmlFor='subject' className='modern-contact-label'>
                  {ui.subjectLabel}
                </label>
              </div>
              {fieldErrors.subject && (touchedFields.subject || hasAttemptedSubmit) ? (
                <div id='contact_subject_error' className='contact-field-error'>
                  {fieldErrors.subject}
                </div>
              ) : null}
            </div>

            <div className='col-md-12'>
              <div className='modern-contact-field textarea-field'>
                <textarea
                  name='message'
                  id='message'
                  className={`bg-white form-control h-100px contact-form-control modern-contact-input modern-contact-textarea${fieldErrors.message ? ' contact-form-control-invalid' : ''}`}
                  placeholder=' '
                  value={formValues.message}
                  onChange={event => handleFieldChange('message', event.target.value)}
                  onBlur={() => handleFieldBlur('message')}
                  aria-invalid={Boolean(fieldErrors.message)}
                  aria-describedby={fieldErrors.message ? 'contact_message_error' : undefined}
                  required
                />
                <label htmlFor='message' className='modern-contact-label'>
                  {t.message}
                </label>
              </div>
              {fieldErrors.message && (touchedFields.message || hasAttemptedSubmit) ? (
                <div id='contact_message_error' className='contact-field-error'>
                  {fieldErrors.message}
                </div>
              ) : null}
            </div>

            <div className='col-md-12'>
              <label className='policy-check'>
                <input
                  type='checkbox'
                  name='datenschutz'
                  className='policy-check-input'
                  checked={policyAccepted}
                  onChange={event => {
                    setPolicyAccepted(event.target.checked)
                    if (event.target.checked) setPolicyError('')
                  }}
                  required
                />
                <span>
                  {ui.policyText}
                  <Link href={privacyHref}>{ui.policyLinkText}</Link>.
                </span>
              </label>
              {policyError ? (
                <div className='contact-field-error' role='alert'>
                  {policyError}
                </div>
              ) : null}
            </div>

            <div className='col-md-12'>
              <div id='submit' className='contact-submit-row'>
                <button type='submit' id='send_message' className='btn-main contact-submit-btn' disabled={submitting}>
                  {submitting ? <span className='contact-submit-spinner' aria-hidden='true' /> : null}
                  <span>{submitting ? ui.sending : t.send}</span>
                </button>
                <div className='contact-assistant-note'>
                  <span>{ui.assistantNote}</span>
                </div>
              </div>

              {errorMessage ? (
                <div className='contact-feedback contact-feedback-error' role='alert'>
                  {errorMessage}
                </div>
              ) : null}
            </div>
          </div>
        </form>
      </div>

      {showSuccessModal ? (
        <div className='booking-inquiry-modal-backdrop' role='dialog' aria-modal='true' aria-label={ui.modalTitle} onClick={() => setShowSuccessModal(false)}>
          <div className='booking-inquiry-modal-card' onClick={event => event.stopPropagation()}>
            <h4 className='mb-2'>{ui.modalTitle}</h4>
            <p className='mb-3'>{ui.modalBody}</p>
            <button type='button' className='btn-main' onClick={() => setShowSuccessModal(false)}>
              {ui.modalClose}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
