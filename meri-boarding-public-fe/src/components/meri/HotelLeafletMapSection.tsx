'use client'

type HotelLeafletMapSectionProps = {
  title: string
  query: string
  lat: number
  lng: number
  zoom?: number
}

export default function HotelLeafletMapSection({
  title,
  query,
  lat,
  lng,
  zoom = 14
}: HotelLeafletMapSectionProps) {
  const address = String(query || '').trim()
  const normalizedZoom = Math.min(20, Math.max(3, zoom))
  const mapQuery = address || `${lat},${lng}`
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=${normalizedZoom}&output=embed`

  return (
    <section className='py-5'>
      <div className='container'>
        <div className='d-flex align-items-center justify-content-between mb-3'>
          <h3 className='mb-0'>{title}</h3>
          <span className='fs-14' style={{ opacity: 0.75 }}>
            {mapQuery}
          </span>
        </div>
        <div className='rounded-1 overflow-hidden' style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
          <iframe
            title='Hotel Location Map'
            src={embedUrl}
            width='100%'
            height='420'
            style={{ border: 0, display: 'block' }}
            loading='lazy'
            referrerPolicy='no-referrer-when-downgrade'
          />
        </div>
      </div>
    </section>
  )
}
