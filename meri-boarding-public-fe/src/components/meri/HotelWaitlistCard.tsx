'use client'

import { FormEvent, useState } from 'react'

export type HotelWaitlistCopy = {
  title: string
  text: string
  playful: string
  waitlistTitle: string
  nameLabel: string
  emailLabel: string
  phoneLabel: string
  stayTypeLabel: string
  stayTypeShort: string
  stayTypeLong: string
  cta: string
  successTitle: string
  successText: string
  validationError: string
}

type HotelWaitlistCardProps = {
  copy: HotelWaitlistCopy
}

type WaitlistFormValues = {
  name: string
  email: string
  phone: string
  stayType: string
}

type WaitlistFormErrors = {
  name: boolean
  email: boolean
  phone: boolean
  stayType: boolean
}

const baseFieldStyle = {
  background: 'rgba(255,255,255,0.94)',
  border: '1px solid rgba(255,255,255,0.55)'
} as const

const invalidFieldStyle = {
  border: '1px solid #ff6b6b',
  boxShadow: '0 0 0 2px rgba(255, 107, 107, 0.18)'
} as const

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^[0-9+()\-\s]{7,}$/

const validateForm = (values: WaitlistFormValues): WaitlistFormErrors => {
  const trimmedName = values.name.trim()
  const trimmedEmail = values.email.trim()
  const trimmedPhone = values.phone.trim()

  return {
    name: trimmedName.length < 3,
    email: !emailPattern.test(trimmedEmail),
    phone: trimmedPhone.length > 0 ? !phonePattern.test(trimmedPhone) : false,
    stayType: values.stayType !== 'short' && values.stayType !== 'long'
  }
}

export default function HotelWaitlistCard({ copy }: HotelWaitlistCardProps) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false)
  const [formValues, setFormValues] = useState<WaitlistFormValues>({
    name: '',
    email: '',
    phone: '',
    stayType: ''
  })
  const [formErrors, setFormErrors] = useState<WaitlistFormErrors>({
    name: false,
    email: false,
    phone: false,
    stayType: false
  })

  const getFieldStyle = (invalid: boolean, extra?: Record<string, string | number>) => ({
    ...baseFieldStyle,
    ...(invalid ? invalidFieldStyle : {}),
    ...(extra || {})
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHasTriedSubmit(true)

    const nextErrors = validateForm(formValues)
    setFormErrors(nextErrors)
    const hasErrors = Object.values(nextErrors).some(Boolean)

    if (hasErrors) {
      return
    }

    setIsSubmitted(true)
  }

  const handleFieldChange = (field: keyof WaitlistFormValues, value: string) => {
    const nextValues = { ...formValues, [field]: value }
    setFormValues(nextValues)

    if (hasTriedSubmit) {
      setFormErrors(validateForm(nextValues))
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        aria-hidden='true'
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -18,
          transform: 'translateX(-50%)',
          width: '72%',
          height: 28,
          borderRadius: '999px',
          background: 'rgba(0, 0, 0, 0.34)',
          filter: 'blur(16px)',
          opacity: 0.28,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <div
        className='rounded-1 p-40 text-white hotel-checkin-card'
        style={{
          background:
            'radial-gradient(circle at 85% 20%, rgba(255,255,255,0.2) 0, rgba(255,255,255,0) 32%), linear-gradient(145deg, color-mix(in srgb, var(--primary-color) 82%, black 18%) 0%, color-mix(in srgb, var(--primary-color) 68%, black 32%) 100%)',
          border: '1px solid rgba(202,160,92,0.74)',
          boxShadow:
            '0 0 0 1px rgba(202,160,92,0.38), 0 0 26px rgba(202,160,92,0.26), inset 0 1px 0 rgba(255,229,181,0.34)',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1,
          transition: 'box-shadow 420ms cubic-bezier(0.19, 1, 0.22, 1), filter 420ms cubic-bezier(0.19, 1, 0.22, 1)'
        }}
      >
        <img
        src='/meri-logo-mark.svg'
        alt=''
        aria-hidden='true'
        style={{
          position: 'absolute',
          inset: '50% auto auto 50%',
          transform: 'translate(-50%, -50%)',
          width: '78%',
          maxWidth: 520,
          opacity: 0.014,
          filter: 'brightness(0) invert(1)',
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      />
        <div
        aria-hidden='true'
        style={{
          position: 'absolute',
          right: 14,
          bottom: 14,
          pointerEvents: 'none'
        }}
      >
        <img
          src='/meri-logo-mark.svg'
          alt=''
          style={{
            width: 800,
            height: 800,
            opacity: 0.12,
            filter: 'brightness(0) invert(1)'
          }}
        />
      </div>
        <div className='d-flex align-items-center gap-2 mb-2'>
        <div className='fw-bold fs-20'>{copy.title}</div>
        </div>
        <p className='mb-0' style={{ opacity: 0.94, position: 'relative', zIndex: 1 }}>
        {copy.text}
        </p>
        <div
        className='mt-4'
        style={{
          paddingTop: 12,
          borderTop: '1px dashed rgba(255,255,255,0.35)'
        }}
      >
        <div
          className='d-inline-flex align-items-center gap-2'
          style={{
            fontSize: 14,
            fontStyle: 'italic',
            opacity: 0.97,
            position: 'relative',
            zIndex: 1
          }}
        >
          <span>{copy.playful}</span>
        </div>
      </div>
        <div
        className='mt-4'
        style={{
          paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.26)'
        }}
      >
        <div className='fw-bold mb-3' style={{ fontSize: 16 }}>
          {copy.waitlistTitle}
        </div>
        {isSubmitted ? (
          <div className='text-center py-3' style={{ position: 'relative', zIndex: 1 }}>
            <i className='fa fa-check-circle' aria-hidden='true' style={{ fontSize: 96, color: '#fff', lineHeight: 1 }}></i>
            <div className='fw-bold mt-3' style={{ fontSize: 20 }}>
              {copy.successTitle}
            </div>
            <div style={{ opacity: 0.94 }}>{copy.successText}</div>
          </div>
        ) : (
          <form action='#' method='post' noValidate onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 1 }}>
            <div className='mb-2'>
              <input
                type='text'
                name='waitlist_name'
                className='form-control'
                placeholder={copy.nameLabel}
                value={formValues.name}
                onChange={event => handleFieldChange('name', event.target.value)}
                aria-invalid={formErrors.name}
                style={getFieldStyle(formErrors.name)}
              />
            </div>
            <div className='mb-2'>
              <input
                type='email'
                name='waitlist_email'
                className='form-control'
                placeholder={copy.emailLabel}
                value={formValues.email}
                onChange={event => handleFieldChange('email', event.target.value)}
                aria-invalid={formErrors.email}
                style={getFieldStyle(formErrors.email)}
              />
            </div>
            <div className='mb-3'>
              <input
                type='tel'
                name='waitlist_phone'
                className='form-control'
                placeholder={copy.phoneLabel}
                value={formValues.phone}
                onChange={event => handleFieldChange('phone', event.target.value)}
                aria-invalid={formErrors.phone}
                style={getFieldStyle(formErrors.phone)}
              />
            </div>
            <div className='mb-3'>
              <select
                name='waitlist_stay_type'
                className='form-control'
                value={formValues.stayType}
                onChange={event => handleFieldChange('stayType', event.target.value)}
                aria-invalid={formErrors.stayType}
                style={getFieldStyle(formErrors.stayType, {
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
                })}
              >
                <option value='' disabled>
                  {copy.stayTypeLabel}
                </option>
                <option value='short'>{copy.stayTypeShort}</option>
                <option value='long'>{copy.stayTypeLong}</option>
              </select>
            </div>
            {hasTriedSubmit && Object.values(formErrors).some(Boolean) ? (
                <div
                className='mb-3'
                style={{
                  fontSize: 13,
                  color: '#ffd6d6',
                  background: 'rgba(180, 26, 26, 0.24)',
                  border: '1px solid rgba(255, 130, 130, 0.6)',
                  borderRadius: 8,
                  padding: '8px 10px'
                }}
              >
                {copy.validationError}
              </div>
            ) : null}
            <button
              type='submit'
              className='btn-main btn-waitlist w-100'
              style={{
                background: '#fff',
                color: 'var(--primary-color)',
                border: '1px solid rgba(255,255,255,0.65)'
              }}
            >
              {copy.cta}
            </button>
          </form>
        )}
        </div>
      </div>
    </div>
  )
}
