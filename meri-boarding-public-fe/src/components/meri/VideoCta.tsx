type VideoCtaProps = {
  videoUrl?: string
}

const defaultVideoUrl = 'https://www.youtube.com/watch?v=L4rcnTwr2Ek&t=77s'

function normalizePopupVideoUrl(input?: string) {
  const raw = String(input || defaultVideoUrl).trim()
  if (!raw) return defaultVideoUrl

  try {
    const parsed = new URL(raw)
    const host = parsed.hostname.toLowerCase()

    if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com') {
      const videoId = parsed.searchParams.get('v')
      if (videoId) return `https://www.youtube.com/watch?v=${videoId}`

      const segments = parsed.pathname.split('/').filter(Boolean)
      if ((segments[0] === 'shorts' || segments[0] === 'embed') && segments[1]) {
        return `https://www.youtube.com/watch?v=${segments[1]}`
      }
    }

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.split('/').filter(Boolean)[0]
      if (videoId) return `https://www.youtube.com/watch?v=${videoId}`
    }

    if (host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com') {
      const segments = parsed.pathname.split('/').filter(Boolean)
      const videoId = segments[segments.length - 1]
      if (videoId) return `https://vimeo.com/${videoId}`
    }

    return raw
  } catch {
    return raw
  }
}

export default function VideoCta({ videoUrl }: VideoCtaProps) {
  const href = normalizePopupVideoUrl(videoUrl)

  return (
    <section className="p-0 mx-2" aria-label="section">
      <div className="container-fluid">
        <div className="row">
          <div className="col-lg-12">
            <a className="d-block hover popup-youtube overflow-hidden rounded-1" href={href}>
              <div className="relative overflow-hidden media-frame media-frame--ultra">
                <div className="absolute start-0 w-100 abs-middle fs-36 text-white text-center z-2">
                  <div className="player bg-color no-border circle wow scaleIn"><span></span></div>
                </div>
                <div className="absolute w-100 h-100 top-0 bg-dark hover-op-05"></div>
                <img
                  src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6639.jpg"
                  className="w-100 hover-scale-1-1"
                  alt=""
                  loading="lazy"
                  fetchPriority="low"
                  decoding="async"
                />
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
