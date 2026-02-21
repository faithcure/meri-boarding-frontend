import type { Locale } from '@/i18n/getLocale'
import { getMessages } from '@/i18n/messages'
import { getServerApiBaseUrl, withPublicApiBaseIfNeeded } from '@/lib/apiBaseUrl'

type CmsReservationContent = {
  hero?: {
    subtitle?: string
    title?: string
    description?: string
    backgroundImage?: string
  }
  crumb?: {
    home?: string
    current?: string
  }
  shortStay?: {
    subtitle?: string
    title?: string
    description?: string
    helper?: string
  }
  form?: {
    action?: string
    checkIn?: string
    checkOut?: string
    boarding?: string
    select?: string
    rooms?: string
    guests?: string
    availability?: string
    boardingOptions?: string[]
    roomOptions?: string[]
    guestOptions?: string[]
  }
  longStay?: {
    title?: string
    description?: string
    bullets?: string[]
    ctaQuote?: string
    ctaContact?: string
  }
  help?: {
    title?: string
    description?: string
    hoursTitle?: string
    hoursDay?: string
    contacts?: Array<{ icon?: string; value?: string }>
    hours?: string[]
  }
  why?: {
    title?: string
    bullets?: string[]
  }
  inquiry?: {
    action?: string
    subtitle?: string
    title?: string
    firstName?: string
    lastName?: string
    company?: string
    email?: string
    phone?: string
    purpose?: string
    nationality?: string
    guests?: string
    rooms?: string
    boarding?: string
    moveIn?: string
    message?: string
    select?: string
    send?: string
    policy?: string
    policyLink?: string
    moveInPlaceholder?: string
    stayPurposes?: Array<{ value?: string; label?: string }>
    boardingOptions?: string[]
    roomOptions?: string[]
  }
}

export type ReservationResolvedContent = {
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
    contacts: Array<{ icon: string; value: string }>
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
    stayPurposes: Array<{ value: string; label: string }>
    boardingOptions: string[]
    roomOptions: string[]
  }
}

const apiBaseUrl = getServerApiBaseUrl()
const API_REVALIDATE_SECONDS = 60

function withApiBaseIfNeeded(url: string) {
  return withPublicApiBaseIfNeeded(url)
}

function resolveContent(locale: Locale, cms?: CmsReservationContent): ReservationResolvedContent {
  const messages = getMessages(locale)
  const reservationFallback = messages.reservation
  const inquiryFallback = messages.bookingInquiryForm

  const fallbackFormBoarding = ['Flamingo', 'Europaplatz', 'Hildesheim']
  const fallbackFormRooms = ['1', '2', '3', '4', '5']
  const fallbackFormGuests = ['1', '2', '3', '4', '5', '6']
  const fallbackHelpContacts = [
    { icon: 'fa fa-phone', value: '+49 (0) 711 54 89 84 - 0' },
    { icon: 'fa fa-whatsapp', value: '+49 (0) 152 06419253' },
    { icon: 'fa fa-envelope', value: 'info@meri-boarding.de' }
  ]
  const fallbackHelpHours = ['08:00 - 12:00', '13:00 - 17:00']
  const fallbackInquiryBoarding = ['Flamingo', 'Europaplatz', 'Hildesheim']
  const fallbackInquiryRooms = ['1', '2', '3']

  const formBoardingOptions = Array.isArray(cms?.form?.boardingOptions)
    ? cms.form.boardingOptions.map(item => String(item || '').trim()).filter(Boolean).slice(0, 20)
    : fallbackFormBoarding
  const formRoomOptions = Array.isArray(cms?.form?.roomOptions)
    ? cms.form.roomOptions.map(item => String(item || '').trim()).filter(Boolean).slice(0, 20)
    : fallbackFormRooms
  const formGuestOptions = Array.isArray(cms?.form?.guestOptions)
    ? cms.form.guestOptions.map(item => String(item || '').trim()).filter(Boolean).slice(0, 20)
    : fallbackFormGuests
  const longStayBullets = Array.isArray(cms?.longStay?.bullets)
    ? cms.longStay.bullets.map(item => String(item || '').trim()).filter(Boolean).slice(0, 20)
    : reservationFallback.longStay.bullets
  const helpContacts = Array.isArray(cms?.help?.contacts)
    ? cms.help.contacts
        .map(item => ({
          icon: String(item?.icon || '').trim() || 'fa fa-info-circle',
          value: String(item?.value || '').trim()
        }))
        .filter(item => Boolean(item.value))
        .slice(0, 10)
    : fallbackHelpContacts
  const helpHours = Array.isArray(cms?.help?.hours)
    ? cms.help.hours.map(item => String(item || '').trim()).filter(Boolean).slice(0, 10)
    : fallbackHelpHours
  const whyBullets = Array.isArray(cms?.why?.bullets)
    ? cms.why.bullets.map(item => String(item || '').trim()).filter(Boolean).slice(0, 20)
    : reservationFallback.why.bullets
  const inquiryPurposes = Array.isArray(cms?.inquiry?.stayPurposes)
    ? cms.inquiry.stayPurposes
        .map(item => ({ value: String(item?.value || '').trim(), label: String(item?.label || '').trim() }))
        .filter(item => Boolean(item.value) && Boolean(item.label))
        .slice(0, 15)
    : inquiryFallback.stayPurposes
  const inquiryBoardingOptions = Array.isArray(cms?.inquiry?.boardingOptions)
    ? cms.inquiry.boardingOptions.map(item => String(item || '').trim()).filter(Boolean).slice(0, 20)
    : fallbackInquiryBoarding
  const inquiryRoomOptions = Array.isArray(cms?.inquiry?.roomOptions)
    ? cms.inquiry.roomOptions.map(item => String(item || '').trim()).filter(Boolean).slice(0, 20)
    : fallbackInquiryRooms

  return {
    hero: {
      subtitle: String(cms?.hero?.subtitle || reservationFallback.hero.subtitle || '').trim(),
      title: String(cms?.hero?.title || reservationFallback.hero.title || '').trim(),
      description: String(cms?.hero?.description || reservationFallback.hero.description || '').trim(),
      backgroundImage:
        withApiBaseIfNeeded(String(cms?.hero?.backgroundImage || '').trim()) ||
        '/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg'
    },
    crumb: {
      home: String(cms?.crumb?.home || reservationFallback.crumb.home || '').trim(),
      current: String(cms?.crumb?.current || reservationFallback.crumb.current || '').trim()
    },
    shortStay: {
      subtitle: String(cms?.shortStay?.subtitle || reservationFallback.shortStay.subtitle || '').trim(),
      title: String(cms?.shortStay?.title || reservationFallback.shortStay.title || '').trim(),
      description: String(cms?.shortStay?.description || reservationFallback.shortStay.description || '').trim(),
      helper: String(cms?.shortStay?.helper || reservationFallback.shortStay.helper || '').trim()
    },
    form: {
      action: String(cms?.form?.action || '#').trim(),
      checkIn: String(cms?.form?.checkIn || reservationFallback.form.checkIn || '').trim(),
      checkOut: String(cms?.form?.checkOut || reservationFallback.form.checkOut || '').trim(),
      boarding: String(cms?.form?.boarding || reservationFallback.form.boarding || '').trim(),
      select: String(cms?.form?.select || reservationFallback.form.select || '').trim(),
      rooms: String(cms?.form?.rooms || reservationFallback.form.rooms || '').trim(),
      guests: String(cms?.form?.guests || reservationFallback.form.guests || '').trim(),
      availability: String(cms?.form?.availability || reservationFallback.form.availability || '').trim(),
      boardingOptions: formBoardingOptions.length > 0 ? formBoardingOptions : fallbackFormBoarding,
      roomOptions: formRoomOptions.length > 0 ? formRoomOptions : fallbackFormRooms,
      guestOptions: formGuestOptions.length > 0 ? formGuestOptions : fallbackFormGuests
    },
    longStay: {
      title: String(cms?.longStay?.title || reservationFallback.longStay.title || '').trim(),
      description: String(cms?.longStay?.description || reservationFallback.longStay.description || '').trim(),
      bullets: longStayBullets.length > 0 ? longStayBullets : reservationFallback.longStay.bullets,
      ctaQuote: String(cms?.longStay?.ctaQuote || reservationFallback.longStay.ctaQuote || '').trim(),
      ctaContact: String(cms?.longStay?.ctaContact || reservationFallback.longStay.ctaContact || '').trim()
    },
    help: {
      title: String(cms?.help?.title || reservationFallback.help.title || '').trim(),
      description: String(cms?.help?.description || reservationFallback.help.description || '').trim(),
      hoursTitle: String(cms?.help?.hoursTitle || reservationFallback.help.hoursTitle || '').trim(),
      hoursDay: String(cms?.help?.hoursDay || reservationFallback.help.hoursDay || '').trim(),
      contacts: helpContacts.length > 0 ? helpContacts : fallbackHelpContacts,
      hours: helpHours.length > 0 ? helpHours : fallbackHelpHours
    },
    why: {
      title: String(cms?.why?.title || reservationFallback.why.title || '').trim(),
      bullets: whyBullets.length > 0 ? whyBullets : reservationFallback.why.bullets
    },
    inquiry: {
      action: String(cms?.inquiry?.action || 'https://meri-boarding.de/boarding-booking.php').trim(),
      subtitle: String(cms?.inquiry?.subtitle || inquiryFallback.subtitle || '').trim(),
      title: String(cms?.inquiry?.title || inquiryFallback.title || '').trim(),
      firstName: String(cms?.inquiry?.firstName || inquiryFallback.firstName || '').trim(),
      lastName: String(cms?.inquiry?.lastName || inquiryFallback.lastName || '').trim(),
      company: String(cms?.inquiry?.company || inquiryFallback.company || '').trim(),
      email: String(cms?.inquiry?.email || inquiryFallback.email || '').trim(),
      phone: String(cms?.inquiry?.phone || inquiryFallback.phone || '').trim(),
      purpose: String(cms?.inquiry?.purpose || inquiryFallback.purpose || '').trim(),
      nationality: String(cms?.inquiry?.nationality || inquiryFallback.nationality || '').trim(),
      guests: String(cms?.inquiry?.guests || inquiryFallback.guests || '').trim(),
      rooms: String(cms?.inquiry?.rooms || inquiryFallback.rooms || '').trim(),
      boarding: String(cms?.inquiry?.boarding || inquiryFallback.boarding || '').trim(),
      moveIn: String(cms?.inquiry?.moveIn || inquiryFallback.moveIn || '').trim(),
      message: String(cms?.inquiry?.message || inquiryFallback.message || '').trim(),
      select: String(cms?.inquiry?.select || inquiryFallback.select || '').trim(),
      send: String(cms?.inquiry?.send || inquiryFallback.send || '').trim(),
      policy: String(cms?.inquiry?.policy || inquiryFallback.policy || '').trim(),
      policyLink: String(cms?.inquiry?.policyLink || inquiryFallback.policyLink || '').trim(),
      moveInPlaceholder: String(cms?.inquiry?.moveInPlaceholder || 'mm/dd/yyyy').trim(),
      stayPurposes: inquiryPurposes.length > 0 ? inquiryPurposes : inquiryFallback.stayPurposes,
      boardingOptions: inquiryBoardingOptions.length > 0 ? inquiryBoardingOptions : fallbackInquiryBoarding,
      roomOptions: inquiryRoomOptions.length > 0 ? inquiryRoomOptions : fallbackInquiryRooms
    }
  }
}

export async function fetchReservationResolvedContent(locale: Locale): Promise<ReservationResolvedContent> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/public/content/reservation?locale=${locale}`, {
      next: { revalidate: API_REVALIDATE_SECONDS }
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch reservation content (${response.status})`)
    }

    const data = await response.json()
    return resolveContent(locale, data?.content || {})
  } catch (error) {
    console.error('[public-fe] falling back to local reservation content', error)
    return resolveContent(locale, {})
  }
}
