import type { HomeResolvedContent } from "@/lib/homeContentApi";

type TestimonialsProps = {
  content?: HomeResolvedContent["testimonials"];
};

export default function Testimonials({ content }: TestimonialsProps = {}) {
  const t = {
    apartmentsCount: content?.apartmentsCount ?? 0,
    backgroundImage: content?.backgroundImage || '',
    apartments: content?.apartments || '',
    locations: content?.locations || '',
    slides: content?.slides || []
  };
  return (
    <section className="text-light jarallax mx-2 rounded-1 overflow-hidden">
      {t.backgroundImage ? <img src={t.backgroundImage} className="jarallax-img" alt="" /> : null}
      <div className="sw-overlay op-6"></div>
      <div className="container relative z-2">
        <div className="row g-4 gx-5 align-items-center">
          <div className="col-lg-5 text-center">
            <h2 className="fs-96 mb-0">{t.apartmentsCount}</h2>
            <span className="d-block id-color wow fadeInUp">{t.apartments}</span>
            {t.locations}
          </div>
          <div className="col-lg-7">
            <div className="owl-single-dots owl-carousel owl-theme">
              {t.slides.map((slide) => (
                <div className="item" key={slide.badge}>
                  <span
                    className="d-inline-flex align-items-center mb-3"
                    style={{
                      background: 'var(--primary-color)',
                      color: '#fff',
                      border: '1px solid color-mix(in srgb, var(--primary-color) 85%, #fff)',
                      borderRadius: 0,
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: 0.2,
                      textTransform: 'uppercase'
                    }}
                  >
                    {slide.badge}
                  </span>
                  <h3 className="mb-4 wow fadeInUp fs-40">{slide.text}</h3>
                  <span className="wow fadeInUp">Meri Boarding Group</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
