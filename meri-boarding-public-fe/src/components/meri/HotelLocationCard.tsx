import Link from 'next/link'

export type HotelLocationCopy = {
  title: string
  hoursTitle: string
  hoursDay: string
  cta: string
}

type HotelLocationCardProps = {
  copy: HotelLocationCopy
  lines: string[]
  phone: string
  whatsapp: string
  email: string
  officeHours: string[]
  ctaHref: string
}

export default function HotelLocationCard({ copy, lines, phone, whatsapp, email, officeHours, ctaHref }: HotelLocationCardProps) {
  return (
    <div className='p-40 bg-white rounded-1'>
      <h3 className='mb-3'>{copy.title}</h3>
      <div className='fs-15'>
        <div className='d-flex align-items-start mb-2'>
          <i className='fa fa-map-marker id-color me-2 mt-1' aria-hidden='true'></i>
          <div>
            {lines.map(line => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </div>
        </div>
        <div className='d-flex align-items-center mb-2'>
          <i className='fa fa-phone id-color me-2' aria-hidden='true'></i>
          <span>{phone}</span>
        </div>
        <div className='d-flex align-items-center mb-2'>
          <i className='fa fa-whatsapp id-color me-2' aria-hidden='true'></i>
          <span>{whatsapp}</span>
        </div>
        <div className='d-flex align-items-center mb-3'>
          <i className='fa fa-envelope id-color me-2' aria-hidden='true'></i>
          <span>{email}</span>
        </div>
        <div className='mb-4'>
          <div className='fw-bold'>{copy.hoursTitle}</div>
          <div>{copy.hoursDay}</div>
          {officeHours.map(hour => (
            <div key={hour}>{hour}</div>
          ))}
        </div>
        <Link href={ctaHref} className='btn-main fx-slide hover-white w-100'>
          <span>{copy.cta}</span>
        </Link>
      </div>
    </div>
  )
}
