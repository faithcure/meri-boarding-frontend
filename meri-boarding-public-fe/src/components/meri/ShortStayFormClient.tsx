'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

type ShortStayFormCopy = {
  action: string
  checkIn: string
  checkOut: string
  boarding: string
  select: string
  rooms: string
  guests: string
  availability: string
  boardingOptions: string[]
  roomOptions: string[]
  guestOptions: string[]
}

type ShortStayFormPrefill = {
  source?: string
  checkIn?: string
  checkOut?: string
  boarding?: string
  boardingSlug?: string
  rooms?: string
  guests?: string
  children?: string
  accessible?: boolean
}

type ShortStayFormClientProps = {
  locale: 'de' | 'en' | 'tr'
  copy: ShortStayFormCopy
  prefill?: ShortStayFormPrefill
}

const selectFieldStyle = {
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  paddingRight: 40,
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M5 7.5L10 12.5L15 7.5' stroke='%23162B3C' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  backgroundSize: '18px 18px',
  cursor: 'pointer'
} as const

const normalizeForMatch = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

const resolveSelectOptionValue = (options: string[], preferredValue?: string) => {
  const preferred = String(preferredValue || '').trim()
  if (!preferred) return ''

  const directMatch = options.find(option => option === preferred)
  if (directMatch) return directMatch

  const normalizedPreferred = normalizeForMatch(preferred)
  if (!normalizedPreferred) return ''

  return (
    options.find(option => {
      const normalizedOption = normalizeForMatch(option)
      return (
        normalizedOption === normalizedPreferred ||
        normalizedOption.includes(normalizedPreferred) ||
        normalizedPreferred.includes(normalizedOption)
      )
    }) || ''
  )
}

export default function ShortStayFormClient({ locale, copy, prefill }: ShortStayFormClientProps) {
  const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim()
  const apiBaseUrl =
    configuredApiBaseUrl.startsWith('http://localhost') || configuredApiBaseUrl.startsWith('https://localhost')
      ? ''
      : configuredApiBaseUrl
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const shouldGuideToInstantReservation = String(prefill?.source || '').trim() === 'hotel-card'
  const resolvedBoardingPrefill = useMemo(() => {
    const fromBoarding = resolveSelectOptionValue(copy.boardingOptions, prefill?.boarding)
    if (fromBoarding) return fromBoarding

    const slug = String(prefill?.boardingSlug || '').trim()
    if (!slug) return ''
    const normalizedSlug = normalizeForMatch(slug)
    if (!normalizedSlug) return ''

    return (
      copy.boardingOptions.find(option => {
        const normalizedOption = normalizeForMatch(option)
        return normalizedOption.includes(normalizedSlug) || normalizedSlug.includes(normalizedOption)
      }) || ''
    )
  }, [copy.boardingOptions, prefill?.boarding, prefill?.boardingSlug])

  const resolvedRoomsPrefill = useMemo(
    () => resolveSelectOptionValue(copy.roomOptions, prefill?.rooms) || copy.roomOptions[0] || '',
    [copy.roomOptions, prefill?.rooms]
  )
  const resolvedGuestsPrefill = useMemo(
    () => resolveSelectOptionValue(copy.guestOptions, prefill?.guests) || copy.guestOptions[0] || '',
    [copy.guestOptions, prefill?.guests]
  )
  const resolvedChildrenPrefill = useMemo(() => {
    const parsed = Number.parseInt(String(prefill?.children || ''), 10)
    if (!Number.isFinite(parsed)) return '0'
    return String(Math.max(0, Math.min(10, parsed)))
  }, [prefill?.children])

  const ui = useMemo(() => {
    if (locale === 'tr') {
      return {
        sending: 'Gonderiliyor...',
        success: 'Talebiniz alindi. Ekibimiz en kisa surede donus yapacaktir.',
        failed: 'Talep alindi ancak e-posta bildirimi gonderilemedi.',
        genericError: 'Talep gonderilemedi. Lutfen tekrar deneyin.',
        firstName: 'Ad',
        lastName: 'Soyad',
        email: 'E-posta',
        phone: 'Telefon',
        children: 'Cocuk Sayisi',
        accessible: 'Engelli erisim ihtiyaci var'
      }
    }
    if (locale === 'de') {
      return {
        sending: 'Wird gesendet...',
        success: 'Ihre Anfrage wurde erhalten. Unser Team meldet sich in Kurze.',
        failed: 'Anfrage erhalten, aber E-Mail-Benachrichtigung fehlgeschlagen.',
        genericError: 'Anfrage konnte nicht gesendet werden. Bitte erneut versuchen.',
        firstName: 'Vorname',
        lastName: 'Nachname',
        email: 'E-Mail',
        phone: 'Telefon',
        children: 'Anzahl Kinder',
        accessible: 'Barrierefrei Bedarf vorhanden'
      }
    }
    return {
      sending: 'Sending...',
      success: 'Your request has been received. Our team will contact you shortly.',
      failed: 'Request received, but email notification failed.',
      genericError: 'Request could not be sent. Please try again.',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      children: 'Number of Child',
      accessible: 'I need accessible accommodation'
    }
  }, [locale])

  useEffect(() => {
    if (!shouldGuideToInstantReservation) return

    const target = document.getElementById('instant-reservation')
    if (!target) return

    const stopHighlight = () => {
      target.classList.remove('instant-reservation-prefill-active')
    }

    const scrollToTarget = () => {
      const offsetTop = 110
      const y = target.getBoundingClientRect().top + window.scrollY - offsetTop
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
    }

    target.classList.add('instant-reservation-prefill-active')
    scrollToTarget()
    const settleTimer = window.setTimeout(scrollToTarget, 320)
    const stopTimer = window.setTimeout(stopHighlight, 9000)

    target.addEventListener('pointerdown', stopHighlight, { once: true })
    target.addEventListener('focusin', stopHighlight, { once: true })

    return () => {
      window.clearTimeout(settleTimer)
      window.clearTimeout(stopTimer)
      target.removeEventListener('pointerdown', stopHighlight)
      target.removeEventListener('focusin', stopHighlight)
      stopHighlight()
    }
  }, [shouldGuideToInstantReservation])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    if (submitting) return

    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }

    const formData = new FormData(form)
    const payload = {
      locale,
      sourcePage: typeof window !== 'undefined' ? window.location.pathname : '/reservation',
      checkIn: String(formData.get('checkIn') || '').trim(),
      checkOut: String(formData.get('checkOut') || '').trim(),
      boarding: String(formData.get('boarding') || '').trim(),
      rooms: String(formData.get('rooms') || '').trim(),
      guests: String(formData.get('guests') || '').trim(),
      children: String(formData.get('children') || '0').trim(),
      accessible: formData.get('accessible') === 'on',
      firstName: String(formData.get('firstName') || '').trim(),
      lastName: String(formData.get('lastName') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      phone: String(formData.get('phone') || '').trim()
    }

    setSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/public/forms/short-stay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string; warning?: string; mailSent?: boolean }

      if (!response.ok) {
        setErrorMessage(String(data?.error || ui.genericError))
        return
      }

      if (data?.mailSent === false) {
        setErrorMessage(String(data?.warning || ui.failed))
        return
      }

      setSuccessMessage(ui.success)
      form.reset()
      const maybeInitDateRangePicker = (window as Window & { initDateRangePicker?: () => void }).initDateRangePicker
      if (typeof maybeInitDateRangePicker === 'function') {
        maybeInitDateRangePicker()
      }
    } catch {
      setErrorMessage(ui.genericError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form name='shortStayForm' id='short_stay_form' method='post' action={copy.action || '#'} onSubmit={handleSubmit}>
      <div className='row g-4 align-items-end'>
        <div className='col-md-6'>
          <div className='fs-18 text-dark fw-500 mb-10'>{ui.firstName}</div>
          <input type='text' name='firstName' className='form-control' required />
        </div>

        <div className='col-md-6'>
          <div className='fs-18 text-dark fw-500 mb-10'>{ui.lastName}</div>
          <input type='text' name='lastName' className='form-control' required />
        </div>

        <div className='col-md-6'>
          <div className='fs-18 text-dark fw-500 mb-10'>{ui.email}</div>
          <input type='email' name='email' className='form-control' required />
        </div>

        <div className='col-md-6'>
          <div className='fs-18 text-dark fw-500 mb-10'>{ui.phone}</div>
          <input type='text' name='phone' className='form-control' required />
        </div>

        <div className='col-md-6'>
          <div className='fs-18 text-dark fw-500 mb-10'>{copy.checkIn}</div>
          <input type='text' id='checkin' name='checkIn' className='form-control' required defaultValue={prefill?.checkIn || undefined} />
        </div>

        <div className='col-md-6'>
          <div className='fs-18 text-dark fw-500 mb-10'>{copy.checkOut}</div>
          <input type='text' id='checkout' name='checkOut' className='form-control' required defaultValue={prefill?.checkOut || undefined} />
        </div>

        <div className='col-md-12'>
          <div className='row g-3 align-items-end'>
            <div className='col-md-12'>
              <div className='fs-18 text-dark fw-500 mb-10 text-nowrap'>{copy.boarding}</div>
              <select name='boarding' className='form-control' style={selectFieldStyle} required defaultValue={resolvedBoardingPrefill || ''}>
                <option value=''>{copy.select}</option>
                {copy.boardingOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className='col-md-12'>
              <div className='row g-3 align-items-end'>
                <div className='col-md-4'>
                  <div className='fs-18 text-dark fw-500 mb-10'>{copy.rooms}</div>
                  <select name='rooms' className='form-control' style={selectFieldStyle} required defaultValue={resolvedRoomsPrefill}>
                    {copy.roomOptions.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='col-md-4'>
                  <div className='fs-18 text-dark fw-500 mb-10'>{copy.guests}</div>
                  <select name='guests' className='form-control' style={selectFieldStyle} required defaultValue={resolvedGuestsPrefill}>
                    {copy.guestOptions.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='col-md-4'>
                  <div className='fs-18 text-dark fw-500 mb-10'>{ui.children}</div>
                  <select name='children' className='form-control' style={selectFieldStyle} defaultValue={resolvedChildrenPrefill}>
                    {Array.from({ length: 11 }, (_, index) => String(index)).map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='col-md-12'>
          <div className='form-check'>
            <input className='form-check-input' type='checkbox' id='short_stay_accessible' name='accessible' defaultChecked={Boolean(prefill?.accessible)} />
            <label className='form-check-label' htmlFor='short_stay_accessible'>
              {ui.accessible}
            </label>
          </div>
        </div>

        <div className='col-md-12'>
          <div id='submit'>
            <button type='submit' id='send_message' className='btn-main w-100' disabled={submitting}>
              {submitting ? ui.sending : copy.availability}
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className='col-md-12'>
            <small className='text-danger'>{errorMessage}</small>
          </div>
        ) : null}
        {successMessage ? (
          <div className='col-md-12'>
            <small className='text-success'>{successMessage}</small>
          </div>
        ) : null}
      </div>
    </form>
  )
}
