import BuyNow from '@/components/meri/BuyNow'
import Footer from '@/components/meri/Footer'
import Header from '@/components/meri/Header'
import HotelCheckinCard from '@/components/meri/HotelCheckinCard'
import HotelGallerySection from '@/components/meri/HotelGallerySection'
import HotelLocationCard, { type HotelLocationCopy } from '@/components/meri/HotelLocationCard'
import HotelMapClient from '@/components/meri/HotelMapClient'
import HotelWaitlistCard, { type HotelWaitlistCopy } from '@/components/meri/HotelWaitlistCard'
import type { Locale } from '@/i18n/getLocale'
import { getLocale } from '@/i18n/getLocale'
import { localePath } from '@/i18n/localePath'
import { getMessages } from '@/i18n/messages'
import { fetchPublicHotelBySlug, fetchPublicHotels } from '@/lib/hotelsApi'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type HotelDynamicPageProps = {
  params: { locale?: Locale; slug: string } | Promise<{ locale?: Locale; slug: string }>
}

type FactView = {
  text: string
  icon: string
}

export default async function HotelDynamicPage({ params }: HotelDynamicPageProps) {
  const resolvedParams = await params
  const locale = resolvedParams?.locale ?? (await getLocale())
  const slug = resolvedParams?.slug
  const fallbackHotelImage = '/images/placeholders/room.svg'
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? '').replace(/\/+$/, '')
  const withApiHost = (url: string) => {
    const value = String(url || '').trim()
    if (!value) return fallbackHotelImage
    return value.startsWith('/api/') && apiBaseUrl ? `${apiBaseUrl}${value}` : value
  }
  const hotel = await fetchPublicHotelBySlug(locale, slug)
  const allHotels = await fetchPublicHotels(locale)
  const messages = getMessages(locale)
  const fallback = messages.hotels
  const hotelDetailMessages = messages.hotelDetail
  const detail = (hotelDetailMessages as Record<string, (typeof hotelDetailMessages)['flamingo']>)[slug] || hotelDetailMessages.europaplatz
  const withLocale = (path: string) => localePath(locale, path)
  const isAvailable = hotel?.available !== false
  const noRoomCopy: HotelWaitlistCopy =
    locale === 'de'
      ? {
          title: 'Dieses Hotel ist aktuell voll',
          text: 'Unsere Gaste schatzen unseren Service sehr, daher sind aktuell alle Zimmer belegt. Sie konnen uns direkt uber die Kontaktdaten im Bereich "Hier finden Sie uns" erreichen.',
          playful: 'Kein Platz mehr im Kofferraum, aber wir finden eine Losung.',
          waitlistTitle: 'Benachrichtigen Sie mich bei Verfugbarkeit',
          nameLabel: 'Vorname Nachname',
          emailLabel: 'E-Mail',
          phoneLabel: 'Telefon',
          stayTypeLabel: 'Aufenthaltsdauer',
          stayTypeShort: 'Kurzfristig (unter 1 Monat)',
          stayTypeLong: 'Langfristig (mehr als 1 Monat)',
          cta: 'Benachrichtigung anfragen',
          successTitle: 'Vielen Dank!',
          successText: 'Wir benachrichtigen Sie, sobald ein Apartment verfugbar ist.',
          validationError: 'Bitte prüfen Sie die markierten Felder.'
        }
      : locale === 'tr'
        ? {
            title: 'Bu otelde su an bos oda yok',
            text: 'Musterilerimiz hizmetimizi cok begendigi icin tum odalarimiz su anda dolu. Dilerseniz asagidaki "Bizi burada bulabilirsiniz" bolumundeki iletisim bilgileriyle bize ulasin.',
            playful: 'Valiz hazir, oda yok; cozum icin bir telefon yeter.',
            waitlistTitle: 'Musaitlik olunca bana haber ver',
            nameLabel: 'Ad Soyad',
            emailLabel: 'E-posta',
            phoneLabel: 'Telefon',
            stayTypeLabel: 'Kalma sekli',
            stayTypeShort: 'Kisa vade (1 aydan kisa)',
            stayTypeLong: 'Uzun vade (1 aydan cok)',
            cta: 'Bilgilerimi birak',
            successTitle: 'Tesekkurler!',
            successText: 'Musaitlik olustugunda size hemen haber verecegiz.',
            validationError: 'Lutfen isaretli alanlari kontrol edin.'
          }
        : {
            title: 'This hotel is currently full',
            text: 'Our guests love our service, so all rooms are currently full. You can contact us directly using the details in the "Find us here" section below.',
            playful: 'Suitcases are ready, rooms are not. Let us find you an option.',
            waitlistTitle: 'Notify me when available',
            nameLabel: 'Full name',
            emailLabel: 'Email',
            phoneLabel: 'Phone',
            stayTypeLabel: 'Stay type',
            stayTypeShort: 'Short term (less than 1 month)',
            stayTypeLong: 'Long term (more than 1 month)',
            cta: 'Request notification',
            successTitle: 'Thank you!',
            successText: 'We will notify you as soon as an apartment is available.',
            validationError: 'Please check the highlighted fields.'
          }

  const normalizeFact = (input: unknown): FactView => {
    if (typeof input === 'string') return { text: input, icon: 'fa fa-check' }
    if (input && typeof input === 'object') {
      const maybeFact = input as { text?: unknown; icon?: unknown; label?: unknown }

      return {
        text: String(maybeFact.text ?? maybeFact.label ?? '').trim(),
        icon: String(maybeFact.icon ?? '').trim() || 'fa fa-check'
      }
    }

    return { text: '', icon: 'fa fa-check' }
  }

  if (!hotel) {
    notFound()
  }

  const facts =
    (hotel.facts || []).map(item => normalizeFact(item)).filter(item => Boolean(item.text)) || []

  const detailFacts = (detail.facts || []).map(item => ({ text: item.label, icon: item.icon || 'fa fa-check' }))
  const viewFacts = facts.length > 0 ? facts : detailFacts

  const viewDescription = hotel.description && hotel.description.length > 0 ? hotel.description : detail.description
  const viewHighlights = hotel.highlights && hotel.highlights.length > 0 ? hotel.highlights : detail.highlights
  const splitIndex = Math.ceil(viewHighlights.length / 2)

  const galleryItems =
    hotel.gallery && hotel.gallery.length > 0
      ? hotel.gallery.map(item => ({
          id: item.id,
          src: withApiHost(item.url || fallbackHotelImage),
          category: item.category || 'other',
          alt: item.alt || `${hotel.name} gallery`,
          meta: {
            sections: item.meta?.sections || []
          }
        }))
      : [
          {
            id: 'fallback',
            src: fallbackHotelImage,
            category: 'rooms',
            alt: `${hotel.name} gallery`,
            meta: { sections: [] }
          }
        ]

  const locationTextBySlug: Record<string, string[]> = {
    europaplatz: ['Meri Boarding Group GmbH', 'Filderbahnstraße 18', 'D-70567 Stuttgart'],
    flamingo: ['Meri Boarding Group GmbH', 'Flamingoweg 70', 'D-70378 Stuttgart'],
    hildesheim: ['Meri Boarding Group GmbH', 'Hildesheim', 'Germany']
  }
  const mapDefaultsBySlug: Record<string, { query: string; lat: number; lng: number; zoom: number }> = {
    europaplatz: {
      query: 'Filderbahnstraße 18, 70567 Stuttgart, Germany',
      lat: 48.7249,
      lng: 9.1655,
      zoom: 15
    },
    flamingo: {
      query: 'Flamingoweg 70, 70378 Stuttgart, Germany',
      lat: 48.8434,
      lng: 9.236,
      zoom: 15
    },
    hildesheim: {
      query: 'Hildesheim, Germany',
      lat: 52.1548,
      lng: 9.9579,
      zoom: 13
    }
  }

  const dynamicAddressLines = String(hotel.location || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
  const locationLines =
    dynamicAddressLines.length > 0 ? ['Meri Boarding Group GmbH', ...dynamicAddressLines] : (locationTextBySlug[slug] || ['Meri Boarding Group GmbH'])
  const locationCopy: HotelLocationCopy = detail.location
  const defaultMap = mapDefaultsBySlug[slug] || mapDefaultsBySlug.europaplatz
  const mapQuery = String(hotel.location || '').trim() || defaultMap.query
  const mapTitle = locale === 'de' ? 'Hier finden Sie uns' : locale === 'tr' ? 'Bizi burada bulabilirsiniz' : 'Find us here'
  const childrenLabel = locale === 'de' ? 'Kinder' : locale === 'tr' ? 'Çocuk' : 'Children'
  const reservationTitle = locale === 'de' ? 'Jetzt Reservieren' : locale === 'tr' ? 'Rezervasyon Yapın' : 'Make a Reservation'
  const otherHotelsTitle = locale === 'de' ? 'Entdecken Sie auch unsere anderen Hotels' : locale === 'tr' ? 'Diğer otellerimizi de keşfedin' : 'Discover Our Other Hotels'
  const otherHotelsSubtitle = locale === 'de' ? 'Falls dieses Haus nicht perfekt passt, finden Sie hier weitere Optionen.' : locale === 'tr' ? 'Bu otel sizin için ideal değilse, diğer seçeneklere göz atın.' : 'If this property is not the perfect fit, explore our other options.'
  const otherHotelsCta = locale === 'de' ? 'Zum Hotel' : locale === 'tr' ? 'Otele Git' : 'View Hotel'
  const otherHotels = allHotels.filter(item => item.slug !== slug).slice(0, 3)

  return (
    <>
      <Header locale={locale} />
      <main>
        <a href='#' id='back-to-top'></a>

        <section className='jarallax text-light relative rounded-1 overflow-hidden mt-80 mt-sm-70 mx-2'>
          <div className='de-gradient-edge-top'></div>
          <img src={withApiHost(hotel.coverImageUrl || fallbackHotelImage)} className='jarallax-img' alt='' />
          <div className='container relative z-2'>
            <div className='row justify-content-center'>
              <div className='col-lg-7 text-center'>
                <div className='subtitle id-color wow fadeInUp mb-2'>{hotel.heroSubtitle || detail.heroSubtitle || fallback.hero.subtitle}</div>
                <div className='clearfix'></div>
                <h2 className='fs-60 fs-xs-8vw wow fadeInUp' data-wow-delay='.4s'>
                  {hotel.heroTitle || detail.heroTitle || hotel.name}
                </h2>
              </div>
            </div>
          </div>
          <div className='crumb-wrapper'>
            <ul className='crumb'>
              <li>
                <Link href={withLocale('/')}>{detail.crumb.home}</Link>
              </li>
              <li>
                <Link href={withLocale('/hotels')}>{detail.crumb.hotels}</Link>
              </li>
              <li className='active'>{hotel.name || detail.crumb.current}</li>
            </ul>
          </div>
          <div className='sw-overlay op-8'></div>
        </section>

        <section>
          <div className='container'>
            <div className='row g-4 gx-5'>
              <div className='col-lg-12'>
                <div className='p-4 fs-18 rounded-1 bg-color-op-1 d-lg-flex d-sm-block flex-wrap align-items-center justify-content-between gap-4 mb-4 fw-500'>
                  {viewFacts.map(fact => (
                    <div className='me-4 d-lg-block py-2 d-sm-inline-block relative lh-1-3 ps-30' key={fact.text}>
                      <i className={`abs start-0 ${fact.icon}`} aria-hidden='true'></i>
                      {fact.text}
                    </div>
                  ))}
                </div>
              </div>

              <div className='col-lg-8'>
                <div className='owl-custom-nav menu-float' data-target={`#${slug}-carousel`}>
                  <a className='btn-next'></a>
                  <a className='btn-prev'></a>

                  <div id={`${slug}-carousel`} className='owl-single-static owl-carousel owl-theme'>
                    {galleryItems.slice(0, 8).map(item => (
                      <div className='item' key={`carousel-${item.id}`}>
                        <div className='relative'>
                          <div className='overflow-hidden rounded-1 media-frame relative'>
                            <img src={item.src} className='w-100' alt={item.alt} />
                            {(item.meta?.sections?.length || 0) > 0 ? (
                              <div
                                className='position-absolute start-0 bottom-0 w-100 text-white'
                                style={{
                                  background: 'color-mix(in srgb, var(--primary-color) 60%, transparent)',
                                  borderTop: '1px solid rgba(255,255,255,0.2)',
                                  padding: '8px 10px'
                                }}
                              >
                                <div className='d-flex align-items-center gap-2'>
                                  <img src='/meri-logo-white.svg' alt='Meri Boarding Group' style={{ height: 24, width: 'auto', flexShrink: 0 }} />
                                  <div className='d-flex align-items-center gap-1 flex-nowrap' style={{ overflowX: 'auto', maxWidth: '100%' }}>
                                    {item.meta.sections.map((section, sectionIndex) => (
                                      <span
                                        key={`${item.id}-section-${sectionIndex}`}
                                        style={{
                                          whiteSpace: 'nowrap',
                                          display: 'inline-flex',
                                          flexDirection: 'column',
                                          paddingLeft: sectionIndex > 0 ? 8 : 0,
                                          marginLeft: sectionIndex > 0 ? 2 : 0,
                                          borderLeft: sectionIndex > 0 ? '1px solid rgba(255,255,255,0.35)' : 'none'
                                        }}
                                      >
                                        {section.title ? <strong style={{ fontSize: 12, lineHeight: 1.15 }}>{section.title}</strong> : null}
                                        {(section.features?.length || 0) > 0 ? (
                                          <span style={{ fontSize: 11, lineHeight: 1.2 }}>{section.features.join(' • ')}</span>
                                        ) : null}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className='spacer-single'></div>
                {viewDescription.map(paragraph => (
                  <p key={paragraph}>{paragraph}</p>
                ))}

                <h3 className='mt-4 mb-3'>{hotel.amenitiesTitle || detail.amenitiesTitle || 'Amenities, services & highlights'}</h3>
                <div className='row'>
                  <div className='col-md-6'>
                    <ul className='ul-check'>
                      {viewHighlights.slice(0, splitIndex).map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className='col-md-6'>
                    <ul className='ul-check'>
                      {viewHighlights.slice(splitIndex).map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className='col-lg-4'>
                <div className='mb-4' id='booking'>
                  {isAvailable ? (
                    <HotelCheckinCard copy={{ ...detail.form, children: childrenLabel, title: reservationTitle }} />
                  ) : (
                    <HotelWaitlistCard copy={noRoomCopy} />
                  )}
                </div>

                <HotelLocationCard
                  copy={locationCopy}
                  lines={locationLines}
                  phone='+49 (0) 711 54 89 84 - 0'
                  whatsapp='+49 (0) 152 06419253'
                  email='info@meri-boarding.de'
                  officeHours={['08:00 - 12:00', '13:00 - 17:00']}
                  ctaHref={withLocale('/contact')}
                />
              </div>
            </div>

          </div>
        </section>

        <section className='bg-color-op-1 py-5'>
          <div className='container'>
            <HotelGallerySection
              items={galleryItems}
              labels={{
                all: detail.gallery.all,
                rooms: detail.gallery.rooms,
                dining: detail.gallery.dining,
                facilities: detail.gallery.facilities,
                view: detail.gallery.view,
                zoomHint: messages.gallery.zoomHint
              }}
            />
            <div className='spacer-single'></div>
          </div>
        </section>
        <HotelMapClient title={mapTitle} query={mapQuery} lat={defaultMap.lat} lng={defaultMap.lng} zoom={defaultMap.zoom} />

        <section className='py-5'>
          <div className='container'>
            <div className='text-center mb-4'>
              <h3 className='mb-2'>{otherHotelsTitle}</h3>
              <p className='mb-0' style={{ opacity: 0.74 }}>
                {otherHotelsSubtitle}
              </p>
            </div>
            {otherHotels.length > 0 ? (
              <div className='row g-4'>
                {otherHotels.map(item => (
                  <div className='col-lg-4 col-md-6' key={item.id}>
                    <div
                      className='h-100 rounded-1 overflow-hidden'
                      style={{
                        border: '1px solid rgba(0,0,0,0.09)',
                        background: '#fff',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.06)'
                      }}
                    >
                      <div className='relative'>
                        <img
                          src={withApiHost(item.coverImageUrl || fallbackHotelImage)}
                          alt={item.name}
                          style={{ width: '100%', height: 220, objectFit: 'cover' }}
                        />
                      </div>
                      <div className='p-4'>
                        <h4 className='mb-2'>{item.name}</h4>
                        <div className='mb-2' style={{ fontSize: 14, opacity: 0.74 }}>
                          {item.location}
                        </div>
                        <p className='mb-3' style={{ minHeight: 64, opacity: 0.86 }}>
                          {item.shortDescription}
                        </p>
                        <Link href={withLocale(`/hotels/${item.slug}`)} className='btn-main btn-line'>
                          {otherHotelsCta}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center' style={{ opacity: 0.72 }}>
                No other active hotels found.
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer locale={locale} />
      <BuyNow />
    </>
  )
}
