'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

type Locale = 'en' | 'de' | 'tr'

type ReservationHelpContact = {
  icon: string
  value: string
}

type ReservationInquiryPurpose = {
  value: string
  label: string
}

type ReservationContent = {
  hero: {
    subtitle: string
    title: string
    description: string
    backgroundImage: string
  }
  crumb: {
    home: string
    current: string
  }
  shortStay: {
    subtitle: string
    title: string
    description: string
    helper: string
  }
  form: {
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
  longStay: {
    title: string
    description: string
    bullets: string[]
    ctaQuote: string
    ctaContact: string
  }
  help: {
    title: string
    description: string
    hoursTitle: string
    hoursDay: string
    contacts: ReservationHelpContact[]
    hours: string[]
  }
  why: {
    title: string
    bullets: string[]
  }
  inquiry: {
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
    stayPurposes: ReservationInquiryPurpose[]
    boardingOptions: string[]
    roomOptions: string[]
  }
}

type ReservationErrors = {
  heroSubtitle?: string
  heroTitle?: string
  heroDescription?: string
  heroBackgroundImage?: string
  crumbHome?: string
  crumbCurrent?: string
  shortSubtitle?: string
  shortTitle?: string
  shortDescription?: string
  shortHelper?: string
  formAction?: string
  formCheckIn?: string
  formCheckOut?: string
  formBoarding?: string
  formSelect?: string
  formRooms?: string
  formGuests?: string
  formAvailability?: string
  formBoardingOptions?: string
  formRoomOptions?: string
  formGuestOptions?: string
  longTitle?: string
  longDescription?: string
  longBullets?: string
  longCtaQuote?: string
  longCtaContact?: string
  helpTitle?: string
  helpDescription?: string
  helpHoursTitle?: string
  helpHoursDay?: string
  helpContacts?: string
  helpHours?: string
  whyTitle?: string
  whyBullets?: string
  inquiryAction?: string
  inquirySubtitle?: string
  inquiryTitle?: string
  inquiryFirstName?: string
  inquiryLastName?: string
  inquiryCompany?: string
  inquiryEmail?: string
  inquiryPhone?: string
  inquiryPurpose?: string
  inquiryNationality?: string
  inquiryGuests?: string
  inquiryRooms?: string
  inquiryBoarding?: string
  inquiryMoveIn?: string
  inquiryMessage?: string
  inquirySelect?: string
  inquirySend?: string
  inquiryPolicy?: string
  inquiryPolicyLink?: string
  inquiryMoveInPlaceholder?: string
  inquiryStayPurposes?: string
  inquiryBoardingOptions?: string
  inquiryRoomOptions?: string
}

const localeOptions: Locale[] = ['en', 'de', 'tr']
const maxOptions = 20
const maxBullets = 20
const maxHelpContacts = 10
const maxHelpHours = 10
const maxPurposes = 15

const createDefaultReservation = (): ReservationContent => ({
  hero: {
    subtitle: '',
    title: '',
    description: '',
    backgroundImage: '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg'
  },
  crumb: {
    home: '',
    current: ''
  },
  shortStay: {
    subtitle: '',
    title: '',
    description: '',
    helper: ''
  },
  form: {
    action: '#',
    checkIn: '',
    checkOut: '',
    boarding: '',
    select: '',
    rooms: '',
    guests: '',
    availability: '',
    boardingOptions: [''],
    roomOptions: [''],
    guestOptions: ['']
  },
  longStay: {
    title: '',
    description: '',
    bullets: [''],
    ctaQuote: '',
    ctaContact: ''
  },
  help: {
    title: '',
    description: '',
    hoursTitle: '',
    hoursDay: '',
    contacts: [{ icon: 'fa fa-phone', value: '' }],
    hours: ['']
  },
  why: {
    title: '',
    bullets: ['']
  },
  inquiry: {
    action: 'https://meri-boarding.de/boarding-booking.php',
    subtitle: '',
    title: '',
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    purpose: '',
    nationality: '',
    guests: '',
    rooms: '',
    boarding: '',
    moveIn: '',
    message: '',
    select: '',
    send: '',
    policy: '',
    policyLink: '',
    moveInPlaceholder: 'mm/dd/yyyy',
    stayPurposes: [{ value: '', label: '' }],
    boardingOptions: [''],
    roomOptions: ['']
  }
})

const normalizeReservation = (input: unknown): ReservationContent => {
  const value = (input || {}) as Partial<ReservationContent>

  const normalizeList = (list: unknown, max = maxOptions) =>
    Array.isArray(list)
      ? list.map(item => String(item || '').trim()).filter(Boolean).slice(0, max)
      : []

  const formBoardingOptions = normalizeList(value?.form?.boardingOptions)
  const formRoomOptions = normalizeList(value?.form?.roomOptions)
  const formGuestOptions = normalizeList(value?.form?.guestOptions)
  const longBullets = normalizeList(value?.longStay?.bullets, maxBullets)
  const helpHours = normalizeList(value?.help?.hours, maxHelpHours)
  const whyBullets = normalizeList(value?.why?.bullets, maxBullets)
  const inquiryBoardingOptions = normalizeList(value?.inquiry?.boardingOptions)
  const inquiryRoomOptions = normalizeList(value?.inquiry?.roomOptions)

  const helpContacts = Array.isArray(value?.help?.contacts)
    ? value.help.contacts
        .map(item => ({
          icon: String(item?.icon || '').trim() || 'fa fa-info-circle',
          value: String(item?.value || '').trim()
        }))
        .filter(item => Boolean(item.value))
        .slice(0, maxHelpContacts)
    : []

  const stayPurposes = Array.isArray(value?.inquiry?.stayPurposes)
    ? value.inquiry.stayPurposes
        .map(item => ({ value: String(item?.value || '').trim(), label: String(item?.label || '').trim() }))
        .filter(item => Boolean(item.value) || Boolean(item.label))
        .slice(0, maxPurposes)
    : []

  return {
    hero: {
      subtitle: String(value?.hero?.subtitle || '').trim(),
      title: String(value?.hero?.title || '').trim(),
      description: String(value?.hero?.description || '').trim(),
      backgroundImage: String(value?.hero?.backgroundImage || '').trim()
    },
    crumb: {
      home: String(value?.crumb?.home || '').trim(),
      current: String(value?.crumb?.current || '').trim()
    },
    shortStay: {
      subtitle: String(value?.shortStay?.subtitle || '').trim(),
      title: String(value?.shortStay?.title || '').trim(),
      description: String(value?.shortStay?.description || '').trim(),
      helper: String(value?.shortStay?.helper || '').trim()
    },
    form: {
      action: String(value?.form?.action || '').trim(),
      checkIn: String(value?.form?.checkIn || '').trim(),
      checkOut: String(value?.form?.checkOut || '').trim(),
      boarding: String(value?.form?.boarding || '').trim(),
      select: String(value?.form?.select || '').trim(),
      rooms: String(value?.form?.rooms || '').trim(),
      guests: String(value?.form?.guests || '').trim(),
      availability: String(value?.form?.availability || '').trim(),
      boardingOptions: formBoardingOptions.length > 0 ? formBoardingOptions : [''],
      roomOptions: formRoomOptions.length > 0 ? formRoomOptions : [''],
      guestOptions: formGuestOptions.length > 0 ? formGuestOptions : ['']
    },
    longStay: {
      title: String(value?.longStay?.title || '').trim(),
      description: String(value?.longStay?.description || '').trim(),
      bullets: longBullets.length > 0 ? longBullets : [''],
      ctaQuote: String(value?.longStay?.ctaQuote || '').trim(),
      ctaContact: String(value?.longStay?.ctaContact || '').trim()
    },
    help: {
      title: String(value?.help?.title || '').trim(),
      description: String(value?.help?.description || '').trim(),
      hoursTitle: String(value?.help?.hoursTitle || '').trim(),
      hoursDay: String(value?.help?.hoursDay || '').trim(),
      contacts: helpContacts.length > 0 ? helpContacts : [{ icon: 'fa fa-phone', value: '' }],
      hours: helpHours.length > 0 ? helpHours : ['']
    },
    why: {
      title: String(value?.why?.title || '').trim(),
      bullets: whyBullets.length > 0 ? whyBullets : ['']
    },
    inquiry: {
      action: String(value?.inquiry?.action || '').trim(),
      subtitle: String(value?.inquiry?.subtitle || '').trim(),
      title: String(value?.inquiry?.title || '').trim(),
      firstName: String(value?.inquiry?.firstName || '').trim(),
      lastName: String(value?.inquiry?.lastName || '').trim(),
      company: String(value?.inquiry?.company || '').trim(),
      email: String(value?.inquiry?.email || '').trim(),
      phone: String(value?.inquiry?.phone || '').trim(),
      purpose: String(value?.inquiry?.purpose || '').trim(),
      nationality: String(value?.inquiry?.nationality || '').trim(),
      guests: String(value?.inquiry?.guests || '').trim(),
      rooms: String(value?.inquiry?.rooms || '').trim(),
      boarding: String(value?.inquiry?.boarding || '').trim(),
      moveIn: String(value?.inquiry?.moveIn || '').trim(),
      message: String(value?.inquiry?.message || '').trim(),
      select: String(value?.inquiry?.select || '').trim(),
      send: String(value?.inquiry?.send || '').trim(),
      policy: String(value?.inquiry?.policy || '').trim(),
      policyLink: String(value?.inquiry?.policyLink || '').trim(),
      moveInPlaceholder: String(value?.inquiry?.moveInPlaceholder || '').trim(),
      stayPurposes: stayPurposes.length > 0 ? stayPurposes : [{ value: '', label: '' }],
      boardingOptions: inquiryBoardingOptions.length > 0 ? inquiryBoardingOptions : [''],
      roomOptions: inquiryRoomOptions.length > 0 ? inquiryRoomOptions : ['']
    }
  }
}

const validateReservation = (value: ReservationContent): ReservationErrors => {
  const errors: ReservationErrors = {}

  if (!value.hero.subtitle.trim()) errors.heroSubtitle = 'Hero subtitle is required.'
  if (!value.hero.title.trim()) errors.heroTitle = 'Hero title is required.'
  if (!value.hero.description.trim()) errors.heroDescription = 'Hero description is required.'
  if (!value.hero.backgroundImage.trim()) errors.heroBackgroundImage = 'Hero background image URL is required.'
  if (!value.crumb.home.trim()) errors.crumbHome = 'Breadcrumb home text is required.'
  if (!value.crumb.current.trim()) errors.crumbCurrent = 'Breadcrumb current text is required.'

  if (!value.shortStay.subtitle.trim()) errors.shortSubtitle = 'Short stay subtitle is required.'
  if (!value.shortStay.title.trim()) errors.shortTitle = 'Short stay title is required.'
  if (!value.shortStay.description.trim()) errors.shortDescription = 'Short stay description is required.'
  if (!value.shortStay.helper.trim()) errors.shortHelper = 'Short stay helper text is required.'

  if (!value.form.action.trim()) errors.formAction = 'Form action URL is required.'
  if (!value.form.checkIn.trim()) errors.formCheckIn = 'Check-in label is required.'
  if (!value.form.checkOut.trim()) errors.formCheckOut = 'Check-out label is required.'
  if (!value.form.boarding.trim()) errors.formBoarding = 'Boarding label is required.'
  if (!value.form.select.trim()) errors.formSelect = 'Select label is required.'
  if (!value.form.rooms.trim()) errors.formRooms = 'Rooms label is required.'
  if (!value.form.guests.trim()) errors.formGuests = 'Guests label is required.'
  if (!value.form.availability.trim()) errors.formAvailability = 'Availability label is required.'

  if (!value.form.boardingOptions.length || value.form.boardingOptions.some(item => !item.trim())) {
    errors.formBoardingOptions = 'Boarding options need at least 1 non-empty row.'
  }

  if (!value.form.roomOptions.length || value.form.roomOptions.some(item => !item.trim())) {
    errors.formRoomOptions = 'Room options need at least 1 non-empty row.'
  }

  if (!value.form.guestOptions.length || value.form.guestOptions.some(item => !item.trim())) {
    errors.formGuestOptions = 'Guest options need at least 1 non-empty row.'
  }

  if (!value.longStay.title.trim()) errors.longTitle = 'Long-stay title is required.'
  if (!value.longStay.description.trim()) errors.longDescription = 'Long-stay description is required.'
  if (!value.longStay.ctaQuote.trim()) errors.longCtaQuote = 'Long-stay quote CTA is required.'
  if (!value.longStay.ctaContact.trim()) errors.longCtaContact = 'Long-stay contact CTA is required.'

  if (!value.longStay.bullets.length || value.longStay.bullets.some(item => !item.trim())) {
    errors.longBullets = 'Long-stay bullets need at least 1 non-empty row.'
  }

  if (!value.help.title.trim()) errors.helpTitle = 'Help title is required.'
  if (!value.help.description.trim()) errors.helpDescription = 'Help description is required.'
  if (!value.help.hoursTitle.trim()) errors.helpHoursTitle = 'Hours title is required.'
  if (!value.help.hoursDay.trim()) errors.helpHoursDay = 'Hours day label is required.'

  if (!value.help.contacts.length || value.help.contacts.some(item => !item.icon.trim() || !item.value.trim())) {
    errors.helpContacts = 'Help contacts need at least 1 non-empty icon + value row.'
  }

  if (!value.help.hours.length || value.help.hours.some(item => !item.trim())) {
    errors.helpHours = 'Help hours need at least 1 non-empty row.'
  }

  if (!value.why.title.trim()) errors.whyTitle = 'Why title is required.'

  if (!value.why.bullets.length || value.why.bullets.some(item => !item.trim())) {
    errors.whyBullets = 'Why bullets need at least 1 non-empty row.'
  }

  if (!value.inquiry.action.trim()) errors.inquiryAction = 'Inquiry form action URL is required.'
  if (!value.inquiry.subtitle.trim()) errors.inquirySubtitle = 'Inquiry subtitle is required.'
  if (!value.inquiry.title.trim()) errors.inquiryTitle = 'Inquiry title is required.'
  if (!value.inquiry.firstName.trim()) errors.inquiryFirstName = 'First name label is required.'
  if (!value.inquiry.lastName.trim()) errors.inquiryLastName = 'Last name label is required.'
  if (!value.inquiry.company.trim()) errors.inquiryCompany = 'Company label is required.'
  if (!value.inquiry.email.trim()) errors.inquiryEmail = 'Email label is required.'
  if (!value.inquiry.phone.trim()) errors.inquiryPhone = 'Phone label is required.'
  if (!value.inquiry.purpose.trim()) errors.inquiryPurpose = 'Purpose label is required.'
  if (!value.inquiry.nationality.trim()) errors.inquiryNationality = 'Nationality label is required.'
  if (!value.inquiry.guests.trim()) errors.inquiryGuests = 'Guests label is required.'
  if (!value.inquiry.rooms.trim()) errors.inquiryRooms = 'Rooms label is required.'
  if (!value.inquiry.boarding.trim()) errors.inquiryBoarding = 'Boarding label is required.'
  if (!value.inquiry.moveIn.trim()) errors.inquiryMoveIn = 'Move-in label is required.'
  if (!value.inquiry.message.trim()) errors.inquiryMessage = 'Message label is required.'
  if (!value.inquiry.select.trim()) errors.inquirySelect = 'Select label is required.'
  if (!value.inquiry.send.trim()) errors.inquirySend = 'Send label is required.'
  if (!value.inquiry.policy.trim()) errors.inquiryPolicy = 'Policy text is required.'
  if (!value.inquiry.policyLink.trim()) errors.inquiryPolicyLink = 'Policy link text is required.'
  if (!value.inquiry.moveInPlaceholder.trim()) errors.inquiryMoveInPlaceholder = 'Move-in placeholder is required.'

  if (
    !value.inquiry.stayPurposes.length ||
    value.inquiry.stayPurposes.some(item => !item.value.trim() || !item.label.trim())
  ) {
    errors.inquiryStayPurposes = 'Stay purposes need at least 1 non-empty value + label row.'
  }

  if (!value.inquiry.boardingOptions.length || value.inquiry.boardingOptions.some(item => !item.trim())) {
    errors.inquiryBoardingOptions = 'Inquiry boarding options need at least 1 non-empty row.'
  }

  if (!value.inquiry.roomOptions.length || value.inquiry.roomOptions.some(item => !item.trim())) {
    errors.inquiryRoomOptions = 'Inquiry room options need at least 1 non-empty row.'
  }

  return errors
}

const hasErrors = (errors: ReservationErrors) => Object.values(errors).some(Boolean)

const moveItem = <T,>(items: T[], from: number, to: number) => {
  if (to < 0 || to >= items.length) return items
  const next = [...items]
  const [moved] = next.splice(from, 1)

  next.splice(to, 0, moved)
  
return next
}

export default function ReservationContentPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [locale, setLocale] = useState<Locale>('de')
  const [expanded, setExpanded] = useState<'hero' | 'short' | 'form' | 'long' | 'help' | 'why' | 'inquiry'>('hero')

  const [formErrors, setFormErrors] = useState<ReservationErrors>({})
  const [uploadErrors, setUploadErrors] = useState<{ hero?: string }>({})
  const [uploadingTarget, setUploadingTarget] = useState<'hero' | null>(null)
  const [reservation, setReservation] = useState<ReservationContent>(createDefaultReservation())

  const loadReservation = useCallback(
    async (targetLocale: Locale) => {
      const token = window.localStorage.getItem('admin_token')

      if (!token) {
        setLoading(false)
        setError('No active session. Please login again.')
        
return
      }

      setError('')
      setSuccess('')
      setFormErrors({})
      setUploadErrors({})

      try {
        const meResponse = await fetch(`${apiBaseUrl}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        const meData = await meResponse.json()

        if (!meResponse.ok) {
          setLoading(false)
          setError(meData?.error || 'Profile check failed.')
          
return
        }

        const canAccess = ['super_admin', 'moderator'].includes(String(meData?.admin?.role || ''))

        setAllowed(canAccess)

        if (!canAccess) {
          setLoading(false)
          
return
        }

        const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/reservation?locale=${targetLocale}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        const data = await response.json()

        if (!response.ok) {
          setLoading(false)
          setError(data?.error || 'Reservation content could not be loaded.')
          
return
        }

        setReservation(normalizeReservation(data?.content || {}))
      } catch {
        setError('API connection failed.')
      } finally {
        setLoading(false)
      }
    },
    [apiBaseUrl]
  )

  useEffect(() => {
    void loadReservation(locale)
  }, [loadReservation, locale])

  const handleLocaleChange = (nextLocale: Locale) => {
    setLocale(nextLocale)
    setLoading(true)
  }

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('File read failed'))
      reader.readAsDataURL(file)
    })

  const uploadReservationImage = async (file: File) => {
    const token = window.localStorage.getItem('admin_token')

    if (!token) return

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setUploadErrors({ hero: 'Only PNG, JPG or WEBP files are allowed.' })

      return
    }

    if (file.size > 8 * 1024 * 1024) {
      setUploadErrors({ hero: 'Image size cannot exceed 8MB.' })

      return
    }

    setUploadingTarget('hero')
    setUploadErrors({ hero: '' })
    setError('')
    setSuccess('')

    try {
      const dataUrl = await toDataUrl(file)

      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/page-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: file.name,
          dataUrl,
          context: 'reservation-hero'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setUploadErrors({ hero: data?.error || 'Image upload failed.' })

        return
      }

      const imageUrl = String(data?.imageUrl || '')

      if (!imageUrl) {
        setUploadErrors({ hero: 'Image upload failed.' })

        return
      }

      setReservation(prev => ({ ...prev, hero: { ...prev.hero, backgroundImage: imageUrl } }))
      setFormErrors(prev => ({ ...prev, heroBackgroundImage: undefined }))
      setSuccess('Image uploaded.')
    } catch {
      setUploadErrors({ hero: 'Image upload failed.' })
    } finally {
      setUploadingTarget(null)
    }
  }

  const handleSave = async () => {
    const token = window.localStorage.getItem('admin_token')

    if (!token) return

    const normalized = normalizeReservation(reservation)
    const validationErrors = validateReservation(normalized)

    setFormErrors(validationErrors)

    if (hasErrors(validationErrors)) {
      if (validationErrors.heroSubtitle || validationErrors.heroTitle || validationErrors.heroDescription || validationErrors.heroBackgroundImage || validationErrors.crumbHome || validationErrors.crumbCurrent) {
        setExpanded('hero')
      } else if (validationErrors.shortSubtitle || validationErrors.shortTitle || validationErrors.shortDescription || validationErrors.shortHelper) {
        setExpanded('short')
      } else if (validationErrors.formAction || validationErrors.formCheckIn || validationErrors.formCheckOut || validationErrors.formBoarding || validationErrors.formSelect || validationErrors.formRooms || validationErrors.formGuests || validationErrors.formAvailability || validationErrors.formBoardingOptions || validationErrors.formRoomOptions || validationErrors.formGuestOptions) {
        setExpanded('form')
      } else if (validationErrors.longTitle || validationErrors.longDescription || validationErrors.longBullets || validationErrors.longCtaQuote || validationErrors.longCtaContact) {
        setExpanded('long')
      } else if (validationErrors.helpTitle || validationErrors.helpDescription || validationErrors.helpHoursTitle || validationErrors.helpHoursDay || validationErrors.helpContacts || validationErrors.helpHours) {
        setExpanded('help')
      } else if (validationErrors.whyTitle || validationErrors.whyBullets) {
        setExpanded('why')
      } else {
        setExpanded('inquiry')
      }

      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/content/reservation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          locale,
          content: normalized
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'Reservation settings could not be saved.')
        
return
      }

      setSuccess('Reservation settings saved.')
      await loadReservation(locale)
    } catch {
      setError('API connection failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Typography>Loading...</Typography>
  if (!allowed) return <Alert severity='error'>Only super admin or moderator can access this panel.</Alert>

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4'>Reservation Content</Typography>
        <Typography color='text.secondary'>Manage all texts and list rows for the reservation page with locale-based editing.</Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}
        {success ? <Alert severity='success'>{success}</Alert> : null}
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <CustomTextField select label='Locale' value={locale} onChange={e => void handleLocaleChange(e.target.value as Locale)} fullWidth>
              {localeOptions.map(item => (
                <MenuItem key={item} value={item}>
                  {item.toUpperCase()}
                </MenuItem>
              ))}
            </CustomTextField>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-4'>
            <Accordion expanded={expanded === 'hero'} onChange={(_, open) => setExpanded(open ? 'hero' : 'short')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Hero & Breadcrumb</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField label='Hero Subtitle' value={reservation.hero.subtitle} onChange={e => setReservation(prev => ({ ...prev, hero: { ...prev.hero, subtitle: e.target.value } }))} error={Boolean(formErrors.heroSubtitle)} helperText={formErrors.heroSubtitle} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <CustomTextField label='Hero Title' value={reservation.hero.title} onChange={e => setReservation(prev => ({ ...prev, hero: { ...prev.hero, title: e.target.value } }))} error={Boolean(formErrors.heroTitle)} helperText={formErrors.heroTitle} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField label='Hero Description' value={reservation.hero.description} onChange={e => setReservation(prev => ({ ...prev, hero: { ...prev.hero, description: e.target.value } }))} error={Boolean(formErrors.heroDescription)} helperText={formErrors.heroDescription} multiline minRows={3} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField label='Hero Background Image URL' value={reservation.hero.backgroundImage} onChange={e => setReservation(prev => ({ ...prev, hero: { ...prev.hero, backgroundImage: e.target.value } }))} error={Boolean(formErrors.heroBackgroundImage)} helperText={formErrors.heroBackgroundImage} fullWidth />
                    <div className='mt-2'>
                      <Button component='label' variant={uploadErrors.hero ? 'contained' : 'outlined'} color={uploadErrors.hero ? 'error' : 'primary'} disabled={Boolean(uploadingTarget) || saving}>
                        {uploadingTarget === 'hero' ? 'Uploading...' : 'Upload Hero Background'}
                        <input
                          hidden
                          type='file'
                          accept='image/png,image/jpeg,image/jpg,image/webp'
                          onChange={event => {
                            const file = event.target.files?.[0]

                            event.currentTarget.value = ''
                            if (file) void uploadReservationImage(file)
                          }}
                        />
                      </Button>
                    </div>
                    {uploadErrors.hero ? (
                      <Typography variant='caption' color='error.main'>
                        {uploadErrors.hero}
                      </Typography>
                    ) : null}
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField label='Breadcrumb Home' value={reservation.crumb.home} onChange={e => setReservation(prev => ({ ...prev, crumb: { ...prev.crumb, home: e.target.value } }))} error={Boolean(formErrors.crumbHome)} helperText={formErrors.crumbHome} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField label='Breadcrumb Current' value={reservation.crumb.current} onChange={e => setReservation(prev => ({ ...prev, crumb: { ...prev.crumb, current: e.target.value } }))} error={Boolean(formErrors.crumbCurrent)} helperText={formErrors.crumbCurrent} fullWidth />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'short'} onChange={(_, open) => setExpanded(open ? 'short' : 'hero')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Short Stay</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField label='Short Stay Subtitle' value={reservation.shortStay.subtitle} onChange={e => setReservation(prev => ({ ...prev, shortStay: { ...prev.shortStay, subtitle: e.target.value } }))} error={Boolean(formErrors.shortSubtitle)} helperText={formErrors.shortSubtitle} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <CustomTextField label='Short Stay Title' value={reservation.shortStay.title} onChange={e => setReservation(prev => ({ ...prev, shortStay: { ...prev.shortStay, title: e.target.value } }))} error={Boolean(formErrors.shortTitle)} helperText={formErrors.shortTitle} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField label='Short Stay Description' value={reservation.shortStay.description} onChange={e => setReservation(prev => ({ ...prev, shortStay: { ...prev.shortStay, description: e.target.value } }))} error={Boolean(formErrors.shortDescription)} helperText={formErrors.shortDescription} multiline minRows={3} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField label='Short Stay Helper' value={reservation.shortStay.helper} onChange={e => setReservation(prev => ({ ...prev, shortStay: { ...prev.shortStay, helper: e.target.value } }))} error={Boolean(formErrors.shortHelper)} helperText={formErrors.shortHelper} fullWidth />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'form'} onChange={(_, open) => setExpanded(open ? 'form' : 'long')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Reservation Form</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.formBoardingOptions ? <Alert severity='error'>{formErrors.formBoardingOptions}</Alert> : null}
                {formErrors.formRoomOptions ? <Alert severity='error'>{formErrors.formRoomOptions}</Alert> : null}
                {formErrors.formGuestOptions ? <Alert severity='error'>{formErrors.formGuestOptions}</Alert> : null}
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField label='Form Action URL' value={reservation.form.action} onChange={e => setReservation(prev => ({ ...prev, form: { ...prev.form, action: e.target.value } }))} error={Boolean(formErrors.formAction)} helperText={formErrors.formAction} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <CustomTextField label='Check In' value={reservation.form.checkIn} onChange={e => setReservation(prev => ({ ...prev, form: { ...prev.form, checkIn: e.target.value } }))} error={Boolean(formErrors.formCheckIn)} helperText={formErrors.formCheckIn} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <CustomTextField label='Check Out' value={reservation.form.checkOut} onChange={e => setReservation(prev => ({ ...prev, form: { ...prev.form, checkOut: e.target.value } }))} error={Boolean(formErrors.formCheckOut)} helperText={formErrors.formCheckOut} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <CustomTextField label='Boarding Label' value={reservation.form.boarding} onChange={e => setReservation(prev => ({ ...prev, form: { ...prev.form, boarding: e.target.value } }))} error={Boolean(formErrors.formBoarding)} helperText={formErrors.formBoarding} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <CustomTextField label='Select Label' value={reservation.form.select} onChange={e => setReservation(prev => ({ ...prev, form: { ...prev.form, select: e.target.value } }))} error={Boolean(formErrors.formSelect)} helperText={formErrors.formSelect} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField label='Rooms Label' value={reservation.form.rooms} onChange={e => setReservation(prev => ({ ...prev, form: { ...prev.form, rooms: e.target.value } }))} error={Boolean(formErrors.formRooms)} helperText={formErrors.formRooms} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField label='Guests Label' value={reservation.form.guests} onChange={e => setReservation(prev => ({ ...prev, form: { ...prev.form, guests: e.target.value } }))} error={Boolean(formErrors.formGuests)} helperText={formErrors.formGuests} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField label='Availability Label' value={reservation.form.availability} onChange={e => setReservation(prev => ({ ...prev, form: { ...prev.form, availability: e.target.value } }))} error={Boolean(formErrors.formAvailability)} helperText={formErrors.formAvailability} fullWidth />
                  </Grid>
                </Grid>

                <Typography variant='subtitle1'>Boarding Options</Typography>
                {reservation.form.boardingOptions.map((item, index) => (
                  <Card key={`form-boarding-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <CustomTextField label={`Boarding Option ${index + 1}`} value={item} onChange={e => setReservation(prev => ({ ...prev, form: { ...prev.form, boardingOptions: prev.form.boardingOptions.map((row, i) => (i === index ? e.target.value : row)) } }))} fullWidth />
                      <div className='flex flex-wrap gap-2'>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, form: { ...prev.form, boardingOptions: moveItem(prev.form.boardingOptions, index, index - 1) } }))} disabled={index === 0}>Move Up</Button>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, form: { ...prev.form, boardingOptions: moveItem(prev.form.boardingOptions, index, index + 1) } }))} disabled={index === reservation.form.boardingOptions.length - 1}>Move Down</Button>
                        <Button size='small' color='error' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, form: { ...prev.form, boardingOptions: prev.form.boardingOptions.filter((_, i) => i !== index) } }))} disabled={reservation.form.boardingOptions.length <= 1}>Remove</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant='outlined' onClick={() => setReservation(prev => ({ ...prev, form: { ...prev.form, boardingOptions: [...prev.form.boardingOptions, ''].slice(0, maxOptions) } }))} disabled={reservation.form.boardingOptions.length >= maxOptions}>Add Boarding Option</Button>

                <Typography variant='subtitle1'>Room Options</Typography>
                {reservation.form.roomOptions.map((item, index) => (
                  <Card key={`form-room-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <CustomTextField label={`Room Option ${index + 1}`} value={item} onChange={e => setReservation(prev => ({ ...prev, form: { ...prev.form, roomOptions: prev.form.roomOptions.map((row, i) => (i === index ? e.target.value : row)) } }))} fullWidth />
                      <div className='flex flex-wrap gap-2'>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, form: { ...prev.form, roomOptions: moveItem(prev.form.roomOptions, index, index - 1) } }))} disabled={index === 0}>Move Up</Button>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, form: { ...prev.form, roomOptions: moveItem(prev.form.roomOptions, index, index + 1) } }))} disabled={index === reservation.form.roomOptions.length - 1}>Move Down</Button>
                        <Button size='small' color='error' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, form: { ...prev.form, roomOptions: prev.form.roomOptions.filter((_, i) => i !== index) } }))} disabled={reservation.form.roomOptions.length <= 1}>Remove</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant='outlined' onClick={() => setReservation(prev => ({ ...prev, form: { ...prev.form, roomOptions: [...prev.form.roomOptions, ''].slice(0, maxOptions) } }))} disabled={reservation.form.roomOptions.length >= maxOptions}>Add Room Option</Button>

                <Typography variant='subtitle1'>Guest Options</Typography>
                {reservation.form.guestOptions.map((item, index) => (
                  <Card key={`form-guest-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <CustomTextField label={`Guest Option ${index + 1}`} value={item} onChange={e => setReservation(prev => ({ ...prev, form: { ...prev.form, guestOptions: prev.form.guestOptions.map((row, i) => (i === index ? e.target.value : row)) } }))} fullWidth />
                      <div className='flex flex-wrap gap-2'>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, form: { ...prev.form, guestOptions: moveItem(prev.form.guestOptions, index, index - 1) } }))} disabled={index === 0}>Move Up</Button>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, form: { ...prev.form, guestOptions: moveItem(prev.form.guestOptions, index, index + 1) } }))} disabled={index === reservation.form.guestOptions.length - 1}>Move Down</Button>
                        <Button size='small' color='error' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, form: { ...prev.form, guestOptions: prev.form.guestOptions.filter((_, i) => i !== index) } }))} disabled={reservation.form.guestOptions.length <= 1}>Remove</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant='outlined' onClick={() => setReservation(prev => ({ ...prev, form: { ...prev.form, guestOptions: [...prev.form.guestOptions, ''].slice(0, maxOptions) } }))} disabled={reservation.form.guestOptions.length >= maxOptions}>Add Guest Option</Button>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'long'} onChange={(_, open) => setExpanded(open ? 'long' : 'help')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Long Stay</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.longBullets ? <Alert severity='error'>{formErrors.longBullets}</Alert> : null}
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField label='Long Stay Title' value={reservation.longStay.title} onChange={e => setReservation(prev => ({ ...prev, longStay: { ...prev.longStay, title: e.target.value } }))} error={Boolean(formErrors.longTitle)} helperText={formErrors.longTitle} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField label='Long Stay Quote CTA' value={reservation.longStay.ctaQuote} onChange={e => setReservation(prev => ({ ...prev, longStay: { ...prev.longStay, ctaQuote: e.target.value } }))} error={Boolean(formErrors.longCtaQuote)} helperText={formErrors.longCtaQuote} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField label='Long Stay Description' value={reservation.longStay.description} onChange={e => setReservation(prev => ({ ...prev, longStay: { ...prev.longStay, description: e.target.value } }))} error={Boolean(formErrors.longDescription)} helperText={formErrors.longDescription} multiline minRows={3} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField label='Long Stay Contact CTA' value={reservation.longStay.ctaContact} onChange={e => setReservation(prev => ({ ...prev, longStay: { ...prev.longStay, ctaContact: e.target.value } }))} error={Boolean(formErrors.longCtaContact)} helperText={formErrors.longCtaContact} fullWidth />
                  </Grid>
                </Grid>

                {reservation.longStay.bullets.map((item, index) => (
                  <Card key={`long-bullet-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <CustomTextField label={`Long Stay Bullet ${index + 1}`} value={item} onChange={e => setReservation(prev => ({ ...prev, longStay: { ...prev.longStay, bullets: prev.longStay.bullets.map((row, i) => (i === index ? e.target.value : row)) } }))} fullWidth />
                      <div className='flex flex-wrap gap-2'>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, longStay: { ...prev.longStay, bullets: moveItem(prev.longStay.bullets, index, index - 1) } }))} disabled={index === 0}>Move Up</Button>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, longStay: { ...prev.longStay, bullets: moveItem(prev.longStay.bullets, index, index + 1) } }))} disabled={index === reservation.longStay.bullets.length - 1}>Move Down</Button>
                        <Button size='small' color='error' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, longStay: { ...prev.longStay, bullets: prev.longStay.bullets.filter((_, i) => i !== index) } }))} disabled={reservation.longStay.bullets.length <= 1}>Remove</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant='outlined' onClick={() => setReservation(prev => ({ ...prev, longStay: { ...prev.longStay, bullets: [...prev.longStay.bullets, ''].slice(0, maxBullets) } }))} disabled={reservation.longStay.bullets.length >= maxBullets}>Add Long Stay Bullet</Button>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'help'} onChange={(_, open) => setExpanded(open ? 'help' : 'why')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Help Card</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.helpContacts ? <Alert severity='error'>{formErrors.helpContacts}</Alert> : null}
                {formErrors.helpHours ? <Alert severity='error'>{formErrors.helpHours}</Alert> : null}
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField label='Help Title' value={reservation.help.title} onChange={e => setReservation(prev => ({ ...prev, help: { ...prev.help, title: e.target.value } }))} error={Boolean(formErrors.helpTitle)} helperText={formErrors.helpTitle} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField label='Help Hours Title' value={reservation.help.hoursTitle} onChange={e => setReservation(prev => ({ ...prev, help: { ...prev.help, hoursTitle: e.target.value } }))} error={Boolean(formErrors.helpHoursTitle)} helperText={formErrors.helpHoursTitle} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField label='Help Description' value={reservation.help.description} onChange={e => setReservation(prev => ({ ...prev, help: { ...prev.help, description: e.target.value } }))} error={Boolean(formErrors.helpDescription)} helperText={formErrors.helpDescription} multiline minRows={3} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField label='Help Hours Day Text' value={reservation.help.hoursDay} onChange={e => setReservation(prev => ({ ...prev, help: { ...prev.help, hoursDay: e.target.value } }))} error={Boolean(formErrors.helpHoursDay)} helperText={formErrors.helpHoursDay} fullWidth />
                  </Grid>
                </Grid>

                <Typography variant='subtitle1'>Help Contacts</Typography>
                {reservation.help.contacts.map((item, index) => (
                  <Card key={`help-contact-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <CustomTextField label='Icon Class' value={item.icon} onChange={e => setReservation(prev => ({ ...prev, help: { ...prev.help, contacts: prev.help.contacts.map((row, i) => (i === index ? { ...row, icon: e.target.value } : row)) } }))} fullWidth />
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                          <CustomTextField label='Value' value={item.value} onChange={e => setReservation(prev => ({ ...prev, help: { ...prev.help, contacts: prev.help.contacts.map((row, i) => (i === index ? { ...row, value: e.target.value } : row)) } }))} fullWidth />
                        </Grid>
                      </Grid>
                      <div className='flex flex-wrap gap-2'>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, help: { ...prev.help, contacts: moveItem(prev.help.contacts, index, index - 1) } }))} disabled={index === 0}>Move Up</Button>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, help: { ...prev.help, contacts: moveItem(prev.help.contacts, index, index + 1) } }))} disabled={index === reservation.help.contacts.length - 1}>Move Down</Button>
                        <Button size='small' color='error' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, help: { ...prev.help, contacts: prev.help.contacts.filter((_, i) => i !== index) } }))} disabled={reservation.help.contacts.length <= 1}>Remove</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant='outlined' onClick={() => setReservation(prev => ({ ...prev, help: { ...prev.help, contacts: [...prev.help.contacts, { icon: 'fa fa-info-circle', value: '' }].slice(0, maxHelpContacts) } }))} disabled={reservation.help.contacts.length >= maxHelpContacts}>Add Help Contact</Button>

                <Typography variant='subtitle1'>Help Hours Rows</Typography>
                {reservation.help.hours.map((item, index) => (
                  <Card key={`help-hour-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <CustomTextField label={`Hour Row ${index + 1}`} value={item} onChange={e => setReservation(prev => ({ ...prev, help: { ...prev.help, hours: prev.help.hours.map((row, i) => (i === index ? e.target.value : row)) } }))} fullWidth />
                      <div className='flex flex-wrap gap-2'>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, help: { ...prev.help, hours: moveItem(prev.help.hours, index, index - 1) } }))} disabled={index === 0}>Move Up</Button>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, help: { ...prev.help, hours: moveItem(prev.help.hours, index, index + 1) } }))} disabled={index === reservation.help.hours.length - 1}>Move Down</Button>
                        <Button size='small' color='error' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, help: { ...prev.help, hours: prev.help.hours.filter((_, i) => i !== index) } }))} disabled={reservation.help.hours.length <= 1}>Remove</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant='outlined' onClick={() => setReservation(prev => ({ ...prev, help: { ...prev.help, hours: [...prev.help.hours, ''].slice(0, maxHelpHours) } }))} disabled={reservation.help.hours.length >= maxHelpHours}>Add Help Hour Row</Button>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'why'} onChange={(_, open) => setExpanded(open ? 'why' : 'inquiry')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Why Companies</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.whyBullets ? <Alert severity='error'>{formErrors.whyBullets}</Alert> : null}
                <CustomTextField label='Why Title' value={reservation.why.title} onChange={e => setReservation(prev => ({ ...prev, why: { ...prev.why, title: e.target.value } }))} error={Boolean(formErrors.whyTitle)} helperText={formErrors.whyTitle} fullWidth />
                {reservation.why.bullets.map((item, index) => (
                  <Card key={`why-bullet-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <CustomTextField label={`Why Bullet ${index + 1}`} value={item} onChange={e => setReservation(prev => ({ ...prev, why: { ...prev.why, bullets: prev.why.bullets.map((row, i) => (i === index ? e.target.value : row)) } }))} fullWidth />
                      <div className='flex flex-wrap gap-2'>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, why: { ...prev.why, bullets: moveItem(prev.why.bullets, index, index - 1) } }))} disabled={index === 0}>Move Up</Button>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, why: { ...prev.why, bullets: moveItem(prev.why.bullets, index, index + 1) } }))} disabled={index === reservation.why.bullets.length - 1}>Move Down</Button>
                        <Button size='small' color='error' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, why: { ...prev.why, bullets: prev.why.bullets.filter((_, i) => i !== index) } }))} disabled={reservation.why.bullets.length <= 1}>Remove</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant='outlined' onClick={() => setReservation(prev => ({ ...prev, why: { ...prev.why, bullets: [...prev.why.bullets, ''].slice(0, maxBullets) } }))} disabled={reservation.why.bullets.length >= maxBullets}>Add Why Bullet</Button>
              </AccordionDetails>
            </Accordion>

            <Accordion expanded={expanded === 'inquiry'} onChange={(_, open) => setExpanded(open ? 'inquiry' : 'why')} variant='outlined' disableGutters>
              <AccordionSummary expandIcon={<i className='bx-chevron-down' />}>
                <Typography variant='h6'>Inquiry Form</Typography>
              </AccordionSummary>
              <AccordionDetails className='flex flex-col gap-3'>
                {formErrors.inquiryStayPurposes ? <Alert severity='error'>{formErrors.inquiryStayPurposes}</Alert> : null}
                {formErrors.inquiryBoardingOptions ? <Alert severity='error'>{formErrors.inquiryBoardingOptions}</Alert> : null}
                {formErrors.inquiryRoomOptions ? <Alert severity='error'>{formErrors.inquiryRoomOptions}</Alert> : null}
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField label='Inquiry Form Action URL' value={reservation.inquiry.action} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, action: e.target.value } }))} error={Boolean(formErrors.inquiryAction)} helperText={formErrors.inquiryAction} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField label='Inquiry Subtitle' value={reservation.inquiry.subtitle} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, subtitle: e.target.value } }))} error={Boolean(formErrors.inquirySubtitle)} helperText={formErrors.inquirySubtitle} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField label='Inquiry Title' value={reservation.inquiry.title} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, title: e.target.value } }))} error={Boolean(formErrors.inquiryTitle)} helperText={formErrors.inquiryTitle} fullWidth />
                  </Grid>

                  <Grid size={{ xs: 12, md: 3 }}><CustomTextField label='First Name Label' value={reservation.inquiry.firstName} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, firstName: e.target.value } }))} error={Boolean(formErrors.inquiryFirstName)} helperText={formErrors.inquiryFirstName} fullWidth /></Grid>
                  <Grid size={{ xs: 12, md: 3 }}><CustomTextField label='Last Name Label' value={reservation.inquiry.lastName} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, lastName: e.target.value } }))} error={Boolean(formErrors.inquiryLastName)} helperText={formErrors.inquiryLastName} fullWidth /></Grid>
                  <Grid size={{ xs: 12, md: 3 }}><CustomTextField label='Company Label' value={reservation.inquiry.company} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, company: e.target.value } }))} error={Boolean(formErrors.inquiryCompany)} helperText={formErrors.inquiryCompany} fullWidth /></Grid>
                  <Grid size={{ xs: 12, md: 3 }}><CustomTextField label='Email Label' value={reservation.inquiry.email} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, email: e.target.value } }))} error={Boolean(formErrors.inquiryEmail)} helperText={formErrors.inquiryEmail} fullWidth /></Grid>

                  <Grid size={{ xs: 12, md: 3 }}><CustomTextField label='Phone Label' value={reservation.inquiry.phone} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, phone: e.target.value } }))} error={Boolean(formErrors.inquiryPhone)} helperText={formErrors.inquiryPhone} fullWidth /></Grid>
                  <Grid size={{ xs: 12, md: 3 }}><CustomTextField label='Purpose Label' value={reservation.inquiry.purpose} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, purpose: e.target.value } }))} error={Boolean(formErrors.inquiryPurpose)} helperText={formErrors.inquiryPurpose} fullWidth /></Grid>
                  <Grid size={{ xs: 12, md: 3 }}><CustomTextField label='Nationality Label' value={reservation.inquiry.nationality} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, nationality: e.target.value } }))} error={Boolean(formErrors.inquiryNationality)} helperText={formErrors.inquiryNationality} fullWidth /></Grid>
                  <Grid size={{ xs: 12, md: 3 }}><CustomTextField label='Guests Label' value={reservation.inquiry.guests} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, guests: e.target.value } }))} error={Boolean(formErrors.inquiryGuests)} helperText={formErrors.inquiryGuests} fullWidth /></Grid>

                  <Grid size={{ xs: 12, md: 3 }}><CustomTextField label='Rooms Label' value={reservation.inquiry.rooms} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, rooms: e.target.value } }))} error={Boolean(formErrors.inquiryRooms)} helperText={formErrors.inquiryRooms} fullWidth /></Grid>
                  <Grid size={{ xs: 12, md: 3 }}><CustomTextField label='Boarding Label' value={reservation.inquiry.boarding} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, boarding: e.target.value } }))} error={Boolean(formErrors.inquiryBoarding)} helperText={formErrors.inquiryBoarding} fullWidth /></Grid>
                  <Grid size={{ xs: 12, md: 3 }}><CustomTextField label='Move-In Label' value={reservation.inquiry.moveIn} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, moveIn: e.target.value } }))} error={Boolean(formErrors.inquiryMoveIn)} helperText={formErrors.inquiryMoveIn} fullWidth /></Grid>
                  <Grid size={{ xs: 12, md: 3 }}><CustomTextField label='Message Label' value={reservation.inquiry.message} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, message: e.target.value } }))} error={Boolean(formErrors.inquiryMessage)} helperText={formErrors.inquiryMessage} fullWidth /></Grid>

                  <Grid size={{ xs: 12, md: 4 }}><CustomTextField label='Select Label' value={reservation.inquiry.select} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, select: e.target.value } }))} error={Boolean(formErrors.inquirySelect)} helperText={formErrors.inquirySelect} fullWidth /></Grid>
                  <Grid size={{ xs: 12, md: 4 }}><CustomTextField label='Send Label' value={reservation.inquiry.send} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, send: e.target.value } }))} error={Boolean(formErrors.inquirySend)} helperText={formErrors.inquirySend} fullWidth /></Grid>
                  <Grid size={{ xs: 12, md: 4 }}><CustomTextField label='Move-In Placeholder' value={reservation.inquiry.moveInPlaceholder} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, moveInPlaceholder: e.target.value } }))} error={Boolean(formErrors.inquiryMoveInPlaceholder)} helperText={formErrors.inquiryMoveInPlaceholder} fullWidth /></Grid>

                  <Grid size={{ xs: 12 }}><CustomTextField label='Policy Text' value={reservation.inquiry.policy} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, policy: e.target.value } }))} error={Boolean(formErrors.inquiryPolicy)} helperText={formErrors.inquiryPolicy} multiline minRows={2} fullWidth /></Grid>
                  <Grid size={{ xs: 12 }}><CustomTextField label='Policy Link Text' value={reservation.inquiry.policyLink} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, policyLink: e.target.value } }))} error={Boolean(formErrors.inquiryPolicyLink)} helperText={formErrors.inquiryPolicyLink} fullWidth /></Grid>
                </Grid>

                <Typography variant='subtitle1'>Stay Purposes</Typography>
                {reservation.inquiry.stayPurposes.map((item, index) => (
                  <Card key={`purpose-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <CustomTextField label='Value' value={item.value} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, stayPurposes: prev.inquiry.stayPurposes.map((row, i) => (i === index ? { ...row, value: e.target.value } : row)) } }))} fullWidth />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <CustomTextField label='Label' value={item.label} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, stayPurposes: prev.inquiry.stayPurposes.map((row, i) => (i === index ? { ...row, label: e.target.value } : row)) } }))} fullWidth />
                        </Grid>
                      </Grid>
                      <div className='flex flex-wrap gap-2'>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, stayPurposes: moveItem(prev.inquiry.stayPurposes, index, index - 1) } }))} disabled={index === 0}>Move Up</Button>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, stayPurposes: moveItem(prev.inquiry.stayPurposes, index, index + 1) } }))} disabled={index === reservation.inquiry.stayPurposes.length - 1}>Move Down</Button>
                        <Button size='small' color='error' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, stayPurposes: prev.inquiry.stayPurposes.filter((_, i) => i !== index) } }))} disabled={reservation.inquiry.stayPurposes.length <= 1}>Remove</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant='outlined' onClick={() => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, stayPurposes: [...prev.inquiry.stayPurposes, { value: '', label: '' }].slice(0, maxPurposes) } }))} disabled={reservation.inquiry.stayPurposes.length >= maxPurposes}>Add Stay Purpose</Button>

                <Typography variant='subtitle1'>Inquiry Boarding Options</Typography>
                {reservation.inquiry.boardingOptions.map((item, index) => (
                  <Card key={`inquiry-boarding-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <CustomTextField label={`Boarding Option ${index + 1}`} value={item} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, boardingOptions: prev.inquiry.boardingOptions.map((row, i) => (i === index ? e.target.value : row)) } }))} fullWidth />
                      <div className='flex flex-wrap gap-2'>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, boardingOptions: moveItem(prev.inquiry.boardingOptions, index, index - 1) } }))} disabled={index === 0}>Move Up</Button>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, boardingOptions: moveItem(prev.inquiry.boardingOptions, index, index + 1) } }))} disabled={index === reservation.inquiry.boardingOptions.length - 1}>Move Down</Button>
                        <Button size='small' color='error' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, boardingOptions: prev.inquiry.boardingOptions.filter((_, i) => i !== index) } }))} disabled={reservation.inquiry.boardingOptions.length <= 1}>Remove</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant='outlined' onClick={() => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, boardingOptions: [...prev.inquiry.boardingOptions, ''].slice(0, maxOptions) } }))} disabled={reservation.inquiry.boardingOptions.length >= maxOptions}>Add Inquiry Boarding Option</Button>

                <Typography variant='subtitle1'>Inquiry Room Options</Typography>
                {reservation.inquiry.roomOptions.map((item, index) => (
                  <Card key={`inquiry-room-${index}`} variant='outlined'>
                    <CardContent className='flex flex-col gap-2'>
                      <CustomTextField label={`Room Option ${index + 1}`} value={item} onChange={e => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, roomOptions: prev.inquiry.roomOptions.map((row, i) => (i === index ? e.target.value : row)) } }))} fullWidth />
                      <div className='flex flex-wrap gap-2'>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, roomOptions: moveItem(prev.inquiry.roomOptions, index, index - 1) } }))} disabled={index === 0}>Move Up</Button>
                        <Button size='small' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, roomOptions: moveItem(prev.inquiry.roomOptions, index, index + 1) } }))} disabled={index === reservation.inquiry.roomOptions.length - 1}>Move Down</Button>
                        <Button size='small' color='error' variant='outlined' onClick={() => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, roomOptions: prev.inquiry.roomOptions.filter((_, i) => i !== index) } }))} disabled={reservation.inquiry.roomOptions.length <= 1}>Remove</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant='outlined' onClick={() => setReservation(prev => ({ ...prev, inquiry: { ...prev.inquiry, roomOptions: [...prev.inquiry.roomOptions, ''].slice(0, maxOptions) } }))} disabled={reservation.inquiry.roomOptions.length >= maxOptions}>Add Inquiry Room Option</Button>
              </AccordionDetails>
            </Accordion>

            <div className='flex justify-end'>
              <Button variant='contained' onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Reservation Content'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
