'use client'

import { FormEvent, useMemo, useRef, useState } from 'react'
import Link from 'next/link'

type BookingInquiryCopy = {
  action: string
  subtitle: string
  title: string
  firstName: string
  lastName: string
  company: string
  email: string
  phone: string
  purpose: string
  nationality: string
  guests: string
  rooms: string
  boarding: string
  moveIn: string
  message: string
  select: string
  send: string
  policy: string
  policyLink: string
  moveInPlaceholder: string
  stayPurposes: Array<{ value: string; label: string }>
  boardingOptions: string[]
  roomOptions: string[]
}

type BookingInquiryFormClientProps = {
  locale: 'de' | 'en' | 'tr'
  privacyHref: string
  copy: BookingInquiryCopy
}

export default function BookingInquiryFormClient({ locale, privacyHref, copy }: BookingInquiryFormClientProps) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl =
    configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost')
      ? ''
      : configuredApiBaseUrl
  const [submitting, setSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const ui = useMemo(() => {
    if (locale === 'tr') {
      return {
        sending: 'Gönderiliyor...',
        modalTitle: 'Talebiniz alındı',
        modalBody: 'Ekibimiz en kısa sürede sizinle iletişime geçecek.',
        modalClose: 'Kapat',
        submitError: 'Talep gönderilemedi. Lütfen tekrar deneyin.',
        childrenLabel: 'Number of Child'
      }
    }
    if (locale === 'en') {
      return {
        sending: 'Sending...',
        modalTitle: 'Your request has been received',
        modalBody: 'Our team will contact you shortly.',
        modalClose: 'Close',
        submitError: 'Request could not be sent. Please try again.',
        childrenLabel: 'Number of Child'
      }
    }
    return {
      sending: 'Wird gesendet...',
      modalTitle: 'Ihre Anfrage wurde erhalten',
      modalBody: 'Unser Team wird sich in Kürze bei Ihnen melden.',
      modalClose: 'Schließen',
      submitError: 'Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut.',
      childrenLabel: 'Number of Child'
    }
  }, [locale])
  const adultOptions = Array.from({ length: 10 }, (_, i) => String(i + 1))
  const childOptions = Array.from({ length: 11 }, (_, i) => String(i))
  const minMoveInDate = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    if (submitting) {
      return
    }
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }

    const formData = new FormData(form)
    const payload = {
      locale,
      sourcePage: typeof window !== 'undefined' ? window.location.pathname : '/reservation',
      firstName: String(formData.get('vorname') || '').trim(),
      lastName: String(formData.get('nachname') || '').trim(),
      company: String(formData.get('firma') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      phone: String(formData.get('telefon') || '').trim(),
      purpose: String(formData.get('zweck') || '').trim(),
      nationality: String(formData.get('nationalitat') || '').trim(),
      guests: String(formData.get('anzahl_personen') || '').trim(),
      children: String(formData.get('anzahl_cocuk') || '').trim(),
      rooms: String(formData.get('anzahl_zimmer') || '').trim(),
      boarding: String(formData.get('boardinghaus') || '').trim(),
      moveIn: String(formData.get('date') || '').trim(),
      message: String(formData.get('nachricht') || '').trim()
    }

    setSubmitting(true)
    setErrorMessage('')
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/public/forms/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await response.json().catch(() => ({} as { error?: string }))
      if (!response.ok) {
        setErrorMessage(String(data?.error || ui.submitError))
        return
      }
      setSubmitting(false)
      setShowSuccessModal(true)
      formRef.current?.reset()
    } catch {
      setErrorMessage(ui.submitError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className='relative mt-80 request-quote-section'>
      <div className='container'>
        <div className='row justify-content-center mb-4'>
          <div className='col-lg-8 text-center'>
            <div className='subtitle id-color wow fadeInUp'>{copy.subtitle}</div>
            <h2 className='wow fadeInUp' data-wow-delay='.2s'>
              {copy.title}
            </h2>
          </div>
        </div>

        <div className='row justify-content-center'>
          <div className='col-lg-10'>
            <div className='bg-color-op-1 rounded-1 p-40 relative request-quote-card'>
              <form ref={formRef} name='bookingInquiryForm' id='booking_inquiry_form' method='post' action={copy.action} onSubmit={handleSubmit}>
                <div className='row g-4'>
                  <div className='col-md-6'>
                    <div className='modern-contact-field'>
                      <input id='inquiry_first_name' type='text' name='vorname' className='bg-white form-control modern-contact-input' placeholder=' ' required />
                      <label htmlFor='inquiry_first_name' className='modern-contact-label'>
                        {copy.firstName}
                      </label>
                    </div>
                  </div>

                  <div className='col-md-6'>
                    <div className='modern-contact-field'>
                      <input id='inquiry_last_name' type='text' name='nachname' className='bg-white form-control modern-contact-input' placeholder=' ' required />
                      <label htmlFor='inquiry_last_name' className='modern-contact-label'>
                        {copy.lastName}
                      </label>
                    </div>
                  </div>

                  <div className='col-md-12'>
                    <div className='modern-contact-field'>
                      <input id='inquiry_company' type='text' name='firma' className='bg-white form-control modern-contact-input' placeholder=' ' />
                      <label htmlFor='inquiry_company' className='modern-contact-label'>
                        {copy.company}
                      </label>
                    </div>
                  </div>

                  <div className='col-md-6'>
                    <div className='modern-contact-field'>
                      <input id='inquiry_email' type='email' name='email' className='bg-white form-control modern-contact-input' placeholder=' ' required />
                      <label htmlFor='inquiry_email' className='modern-contact-label'>
                        {copy.email}
                      </label>
                    </div>
                  </div>

                  <div className='col-md-6'>
                    <div className='modern-contact-field'>
                      <input id='inquiry_phone' type='text' name='telefon' className='bg-white form-control modern-contact-input' placeholder=' ' required />
                      <label htmlFor='inquiry_phone' className='modern-contact-label'>
                        {copy.phone}
                      </label>
                    </div>
                  </div>

                  <div className='col-md-6'>
                    <div className='modern-contact-field select-field'>
                      <select id='inquiry_purpose' name='zweck' className='bg-white form-control modern-contact-input' required>
                        <option value=''>{copy.select}</option>
                        {copy.stayPurposes.map(purpose => (
                          <option key={purpose.value} value={purpose.value}>
                            {purpose.label}
                          </option>
                        ))}
                      </select>
                      <label htmlFor='inquiry_purpose' className='modern-contact-label'>
                        {copy.purpose}
                      </label>
                    </div>
                  </div>

                  <div className='col-md-6'>
                    <div className='modern-contact-field'>
                      <input id='inquiry_nationality' type='text' name='nationalitat' className='bg-white form-control modern-contact-input' placeholder=' ' />
                      <label htmlFor='inquiry_nationality' className='modern-contact-label'>
                        {copy.nationality}
                      </label>
                    </div>
                  </div>

                  <div className='col-md-4'>
                    <div className='modern-contact-field select-field'>
                      <select id='inquiry_guests' name='anzahl_personen' className='bg-white form-control modern-contact-input' required>
                        <option value=''>{copy.select}</option>
                        {adultOptions.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <label htmlFor='inquiry_guests' className='modern-contact-label'>
                        {copy.guests}
                      </label>
                    </div>
                  </div>

                  <div className='col-md-4'>
                    <div className='modern-contact-field select-field'>
                      <select id='inquiry_children' name='anzahl_cocuk' className='bg-white form-control modern-contact-input' defaultValue='0'>
                        {childOptions.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <label htmlFor='inquiry_children' className='modern-contact-label'>
                        {ui.childrenLabel}
                      </label>
                    </div>
                  </div>

                  <div className='col-md-4'>
                    <div className='modern-contact-field select-field'>
                      <select id='inquiry_rooms' name='anzahl_zimmer' className='bg-white form-control modern-contact-input' required>
                        <option value=''>{copy.select}</option>
                        {copy.roomOptions.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <label htmlFor='inquiry_rooms' className='modern-contact-label'>
                        {copy.rooms}
                      </label>
                    </div>
                  </div>

                  <div className='col-md-6'>
                    <div className='modern-contact-field select-field'>
                      <select id='inquiry_boarding' name='boardinghaus' className='bg-white form-control modern-contact-input' required>
                        <option value=''>{copy.select}</option>
                        {copy.boardingOptions.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <label htmlFor='inquiry_boarding' className='modern-contact-label'>
                        {copy.boarding}
                      </label>
                    </div>
                  </div>

                  <div className='col-md-6'>
                    <div className='modern-contact-field select-field'>
                      <input id='inquiry_movein' type='date' name='date' className='bg-white form-control modern-contact-input' min={minMoveInDate} />
                      <label htmlFor='inquiry_movein' className='modern-contact-label'>
                        {copy.moveIn}
                      </label>
                    </div>
                  </div>

                  <div className='col-md-12'>
                    <div className='modern-contact-field textarea-field'>
                      <textarea id='inquiry_message' name='nachricht' className='bg-white form-control h-100px modern-contact-input modern-contact-textarea' placeholder=' '></textarea>
                      <label htmlFor='inquiry_message' className='modern-contact-label'>
                        {copy.message}
                      </label>
                    </div>
                  </div>

                  <div className='col-md-12'>
                    <label className='policy-check'>
                      <input type='checkbox' name='datenschutz' className='policy-check-input' required />
                      <span>
                        {copy.policy}
                        <Link href={privacyHref}>{copy.policyLink}</Link>.
                      </span>
                    </label>
                  </div>

                  <div className='col-md-12'>
                    {errorMessage ? <div className='alert alert-danger mb-3'>{errorMessage}</div> : null}
                    <div id='submit_inquiry'>
                      <button type='submit' className='btn-main contact-submit-btn' disabled={submitting}>
                        <span>{submitting ? ui.sending : copy.send}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
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
    </section>
  )
}
