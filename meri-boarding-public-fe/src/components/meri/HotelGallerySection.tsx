'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type GalleryItem = {
  id: string
  src: string
  thumbSrc?: string
  category: string
  alt: string
  meta?: {
    sections: Array<{
      title: string
      features: string[]
    }>
  }
}

type HotelGallerySectionProps = {
  items: GalleryItem[]
  labels: {
    all: string
    rooms: string
    dining: string
    facilities: string
    view: string
    zoomHint: string
  }
}

const pageSize = 8

export default function HotelGallerySection({ items, labels }: HotelGallerySectionProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'rooms' | 'dining' | 'facilities'>('all')
  const [page, setPage] = useState(1)
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null)
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null)
  const [imageZoom, setImageZoom] = useState(1)
  const modalContentRef = useRef<HTMLDivElement | null>(null)

  const clampZoom = (value: number) => Math.min(3, Math.max(1, Number(value.toFixed(2))))

  const filteredItems = useMemo(
    () => (activeFilter === 'all' ? items : items.filter(item => item.category === activeFilter)),
    [activeFilter, items]
  )
  const modalItems = filteredItems
  const activeItem = activeImageIndex !== null ? (modalItems[activeImageIndex] ?? null) : null
  const activeImageSrc = activeItem?.src ?? null
  const activeImageAlt = activeItem?.alt || (activeImageIndex !== null ? `Hotel gallery ${activeImageIndex + 1}` : '')
  const activeImageMeta = activeItem?.meta || { sections: [] }
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const animationKey = `${activeFilter}-${currentPage}`
  const pagedItems = useMemo(
    () => filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredItems, currentPage]
  )

  useEffect(() => {
    if (!activeImageSrc) return

    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const previousOverscrollBehavior = document.body.style.overscrollBehavior
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    document.body.style.overscrollBehavior = 'none'

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
      document.body.style.overscrollBehavior = previousOverscrollBehavior
    }
  }, [activeImageSrc])

  useEffect(() => {
    if (!activeImageSrc) return
    const node = modalContentRef.current
    if (!node) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const delta = event.deltaY > 0 ? -0.1 : 0.1
      setImageZoom(prev => clampZoom(prev + delta))
    }

    node.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      node.removeEventListener('wheel', handleWheel)
    }
  }, [activeImageSrc])

  return (
    <>
      <div className='row'>
        <div className='col-md-12 text-center'>
          <ul className='gallery-filter-list hotel-gallery-filters d-inline-flex flex-wrap justify-content-center'>
            <li>
              <button
                type='button'
                className={`gallery-filter-btn ${activeFilter === 'all' ? 'is-selected' : ''}`}
                onClick={() => {
                  setActiveFilter('all')
                  setPage(1)
                }}
              >
                {labels.all}
              </button>
            </li>
            <li>
              <button
                type='button'
                className={`gallery-filter-btn ${activeFilter === 'rooms' ? 'is-selected' : ''}`}
                onClick={() => {
                  setActiveFilter('rooms')
                  setPage(1)
                }}
              >
                {labels.rooms}
              </button>
            </li>
            <li>
              <button
                type='button'
                className={`gallery-filter-btn ${activeFilter === 'dining' ? 'is-selected' : ''}`}
                onClick={() => {
                  setActiveFilter('dining')
                  setPage(1)
                }}
              >
                {labels.dining}
              </button>
            </li>
            <li>
              <button
                type='button'
                className={`gallery-filter-btn ${activeFilter === 'facilities' ? 'is-selected' : ''}`}
                onClick={() => {
                  setActiveFilter('facilities')
                  setPage(1)
                }}
              >
                {labels.facilities}
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className='row g-3 hotel-gallery-grid'>
        {pagedItems.map((item, index) => (
          <div
            className={`col-md-3 col-sm-6 col-12 item ${item.category}`}
            key={`${item.id}-${animationKey}`}
            data-gallery-item='1'
            style={{ animationDelay: `${index * 38}ms` }}
          >
            <button
              type='button'
              className='d-block hover w-100 text-start gallery-item-animated'
              style={{ background: 'transparent', border: 0, padding: 0 }}
              onMouseEnter={() => setHoveredImageId(item.id)}
              onMouseLeave={() => setHoveredImageId(null)}
              onClick={() => {
                const indexInFiltered = filteredItems.findIndex(entry => entry.id === item.id)
                setActiveImageIndex(indexInFiltered >= 0 ? indexInFiltered : 0)
                setImageZoom(1)
              }}
            >
              <div
                className='relative overflow-hidden rounded-1 media-frame'
                style={{
                  border:
                    hoveredImageId === item.id
                      ? '2px solid color-mix(in srgb, var(--primary-color) 80%, white 20%)'
                      : '2px solid transparent',
                  boxShadow: 'none'
                }}
              >
                <div className='absolute start-0 w-100 hover-op-1 p-5 abs-middle z-3 text-center text-white'>
                  <span
                    className='d-inline-flex align-items-center justify-content-center'
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      border: '3px solid var(--primary-color)',
                      background: 'rgba(0,0,0,0.22)',
                      boxShadow: '0 0 0 3px rgba(255,255,255,0.2), 0 0 18px color-mix(in srgb, var(--primary-color) 70%, transparent)'
                    }}
                  >
                    <i className='fa fa-search' aria-hidden='true' style={{ fontSize: 18, color: 'var(--primary-color)' }} />
                  </span>
                </div>
                <div className='absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2'></div>
                <img src={item.thumbSrc || item.src} className='w-100' alt={item.alt || `Hotel gallery ${index + 1}`} />
              </div>
            </button>
          </div>
        ))}
      </div>

      {totalPages > 1 ? (
        <div className='d-flex justify-content-center align-items-center gap-1 mt-4 flex-wrap'>
          <button
            type='button'
            className='px-3 py-2 rounded-1 border bg-white text-dark'
            style={{ borderColor: 'rgba(0,0,0,0.14)', minWidth: 38, lineHeight: 1 }}
            disabled={currentPage === 1}
            onClick={() => setPage(p => p - 1)}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pageNumber => (
            <button
              key={pageNumber}
              type='button'
              className='px-3 py-2 rounded-1 border'
              style={{
                minWidth: 38,
                lineHeight: 1,
                borderColor: pageNumber === currentPage ? 'var(--primary-color)' : 'rgba(0,0,0,0.14)',
                background: pageNumber === currentPage ? 'rgba(0,0,0,0.04)' : '#fff',
                color: pageNumber === currentPage ? 'var(--primary-color)' : '#222'
              }}
              onClick={() => setPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type='button'
            className='px-3 py-2 rounded-1 border bg-white text-dark'
            style={{ borderColor: 'rgba(0,0,0,0.14)', minWidth: 38, lineHeight: 1 }}
            disabled={currentPage === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            ›
          </button>
        </div>
      ) : null}

      {activeImageSrc ? (
        <div
          role='dialog'
          aria-modal='true'
          aria-label='Image preview'
          className='position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center'
          style={{ zIndex: 99999, background: 'rgba(0,0,0,0.84)', padding: 24 }}
          onClick={() => {
            setActiveImageIndex(null)
            setImageZoom(1)
          }}
        >
          <button
            type='button'
            aria-label='Close'
            className='position-absolute top-0 end-0 m-3 text-white'
            style={{ background: 'transparent', border: 0, fontSize: 30, lineHeight: 1 }}
            onClick={() => {
              setActiveImageIndex(null)
              setImageZoom(1)
            }}
          >
            ×
          </button>
          <button
            type='button'
            aria-label='Previous image'
            className='position-absolute start-0 top-50 translate-middle-y ms-3 text-white'
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.45)',
              background: 'rgba(0,0,0,0.35)',
              fontSize: 24,
              lineHeight: 1,
              zIndex: 2
            }}
            onClick={event => {
              event.stopPropagation()
              setActiveImageIndex(prev => {
                if (prev === null || modalItems.length === 0) return prev
                return (prev - 1 + modalItems.length) % modalItems.length
              })
              setImageZoom(1)
            }}
          >
            ‹
          </button>
          <button
            type='button'
            aria-label='Next image'
            className='position-absolute end-0 top-50 translate-middle-y me-3 text-white'
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.45)',
              background: 'rgba(0,0,0,0.35)',
              fontSize: 24,
              lineHeight: 1,
              zIndex: 2
            }}
            onClick={event => {
              event.stopPropagation()
              setActiveImageIndex(prev => {
                if (prev === null || modalItems.length === 0) return prev
                return (prev + 1) % modalItems.length
              })
              setImageZoom(1)
            }}
          >
            ›
          </button>
          <div className='position-absolute top-0 start-0 m-3 d-flex align-items-center gap-2'>
            <button
              type='button'
              aria-label='Zoom out'
              className='text-white'
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.45)',
                background: 'rgba(0,0,0,0.35)',
                fontSize: 20,
                lineHeight: 1
              }}
              onClick={event => {
                event.stopPropagation()
                setImageZoom(prev => clampZoom(prev - 0.2))
              }}
            >
              −
            </button>
            <button
              type='button'
              aria-label='Zoom reset'
              className='text-white'
              style={{
                minWidth: 60,
                height: 36,
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.45)',
                background: 'rgba(0,0,0,0.35)',
                fontSize: 13,
                lineHeight: 1,
                padding: '0 10px'
              }}
              onClick={event => {
                event.stopPropagation()
                setImageZoom(1)
              }}
            >
              {Math.round(imageZoom * 100)}%
            </button>
            <button
              type='button'
              aria-label='Zoom in'
              className='text-white'
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.45)',
                background: 'rgba(0,0,0,0.35)',
                fontSize: 20,
                lineHeight: 1
              }}
              onClick={event => {
                event.stopPropagation()
                setImageZoom(prev => clampZoom(prev + 0.2))
              }}
            >
              +
            </button>
          </div>
          <div
            ref={modalContentRef}
            onClick={event => event.stopPropagation()}
            style={{ maxWidth: 'min(1200px, 92vw)', width: '100%' }}
          >
            <div className='position-relative' style={{ transform: `scale(${imageZoom})`, transformOrigin: 'center center', transition: 'transform 120ms ease-out' }}>
              <img
                src={activeImageSrc}
                alt={activeImageAlt}
                style={{
                  width: '100%',
                  maxHeight: '78vh',
                  objectFit: 'contain',
                  borderRadius: 8
                }}
              />
              {(activeImageMeta?.sections?.length || 0) > 0 ? (
                <div
                  className='position-absolute start-0 bottom-0 w-100 text-white'
                  style={{
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8,
                    background: 'color-mix(in srgb, var(--primary-color) 62%, transparent)',
                    borderTop: '1px solid rgba(255,255,255,0.22)',
                    padding: '12px 16px'
                  }}
                >
                  <div className='d-flex align-items-center gap-3 flex-wrap'>
                    <img
                      src='/meri-logo-white.svg'
                      alt='Meri Boarding Group'
                      style={{ height: 42, width: 'auto', flexShrink: 0, opacity: 0.95 }}
                    />
                    <div
                      className='d-flex align-items-center gap-2 flex-nowrap'
                      style={{ overflowX: 'auto', maxWidth: '100%' }}
                    >
                      {activeImageMeta?.sections?.map((section, index) => (
                        <div
                          key={`${section.title}-${index}`}
                          style={{
                            whiteSpace: 'nowrap',
                            fontSize: 14,
                            lineHeight: 1.2,
                            display: 'inline-flex',
                            flexDirection: 'column',
                            paddingLeft: index > 0 ? 10 : 0,
                            marginLeft: index > 0 ? 2 : 0,
                            borderLeft: index > 0 ? '1px solid rgba(255,255,255,0.35)' : 'none'
                          }}
                        >
                          {section.title ? <span style={{ fontWeight: 700, fontSize: 14 }}>{section.title}</span> : null}
                          {(section.features?.length || 0) > 0 ? (
                            <span style={{ opacity: 0.95, fontSize: 13, marginTop: 2 }}>
                              {section.features.join(' • ')}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div className='d-flex justify-content-center mt-2' style={{ opacity: 0.9 }}>
              <span
                aria-label={labels.zoomHint}
                title={labels.zoomHint}
                style={{
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.45)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  color: '#fff',
                  background: 'rgba(0,0,0,0.28)',
                  fontSize: 13,
                  lineHeight: 1,
                  padding: '8px 12px',
                  opacity: imageZoom > 1.01 ? 0 : 1,
                  transform: imageZoom > 1.01 ? 'translateY(4px)' : 'translateY(0)',
                  transition: 'opacity 240ms ease, transform 240ms ease',
                  pointerEvents: imageZoom > 1.01 ? 'none' : 'auto'
                }}
              >
                <i className='fa fa-search-plus' aria-hidden='true' style={{ fontSize: 14 }} />
                <span>{labels.zoomHint}</span>
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
