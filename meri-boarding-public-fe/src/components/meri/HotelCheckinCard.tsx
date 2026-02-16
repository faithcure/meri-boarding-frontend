type HotelCheckinCopy = {
  title?: string
  checkIn: string
  checkOut: string
  rooms: string
  guests: string
  availability: string
  riskFree: string
  children?: string
}

type HotelCheckinCardProps = {
  copy: HotelCheckinCopy
}

const baseFieldStyle = {
  background: 'rgba(255,255,255,0.96)',
  border: '1px solid rgba(255,255,255,0.6)',
  color: '#132433'
} as const

const selectFieldStyle = {
  ...baseFieldStyle,
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

const getChildrenLabel = (copy: HotelCheckinCopy) => {
  if (copy.children?.trim()) return copy.children
  if (copy.guests.includes('Gäste')) return 'Kinder'
  if (copy.guests.includes('Misafir')) return 'Çocuk'
  return 'Children'
}

export default function HotelCheckinCard({ copy }: HotelCheckinCardProps) {
  const childrenLabel = getChildrenLabel(copy)
  const title = copy.title?.trim() || 'Make a Reservation'

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

        <form name='hotelCheckinForm' method='post' action='#' style={{ position: 'relative', zIndex: 1 }}>
          <div className='d-flex align-items-center gap-2 mb-3'>
            <i className='fa fa-calendar-check-o' aria-hidden='true'></i>
            <div className='fw-bold fs-20'>{title}</div>
          </div>
          <div className='row g-3'>
            <div className='col-md-6'>
              <div className='fs-18 fw-500 mb-10'>{copy.checkIn}</div>
              <input type='text' id='checkin' className='form-control' required style={baseFieldStyle} />
            </div>

            <div className='col-md-6'>
              <div className='fs-18 fw-500 mb-10'>{copy.checkOut}</div>
              <input type='text' id='checkout' className='form-control' required style={baseFieldStyle} />
            </div>

            <div className='col-md-4'>
              <div className='fs-18 fw-500 mb-10'>{copy.rooms}</div>
              <select className='form-control' style={selectFieldStyle}>
                {[1, 2, 3].map(count => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>

            <div className='col-md-4'>
              <div className='fs-18 fw-500 mb-10'>{copy.guests}</div>
              <select className='form-control' style={selectFieldStyle}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(count => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>

            <div className='col-md-4'>
              <div className='fs-18 fw-500 mb-10'>{childrenLabel}</div>
              <select className='form-control' style={selectFieldStyle}>
                {[0, 1, 2, 3, 4, 5, 6].map(count => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>

            <div className='col-lg-12 mt-3'>
              <div id='submit'>
                <input type='submit' value={copy.availability} className='btn-main w-100' />
              </div>
            </div>
          </div>
        </form>

        <div
          className='mt-4'
          style={{
            position: 'relative',
            zIndex: 1,
            paddingTop: 12,
            borderTop: '1px dashed rgba(255,255,255,0.35)'
          }}
        >
          <small style={{ opacity: 0.95, display: 'block' }}>{copy.riskFree}</small>
        </div>
      </div>
    </div>
  )
}
