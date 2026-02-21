import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { getMessages } from "@/i18n/messages";
import Link from "next/link";

import type { HomeResolvedContent } from "@/lib/homeContentApi";

type HeroProps = {
  locale?: Locale;
  content?: HomeResolvedContent['hero'];
};

export default async function Hero({ locale: localeProp, content }: HeroProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const t = content || getMessages(locale).hero;
  const withLocale = (path: string) => localePath(locale, path);
  const resolveHref = (value: string, fallback: string) => {
    const raw = String(value || '').trim() || fallback;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return withLocale(raw);
    return withLocale(fallback);
  };
  const locationsHref = resolveHref((t as typeof t & { ctaLocationsHref?: string }).ctaLocationsHref || '', '/hotels');
  const quoteHref = resolveHref((t as typeof t & { ctaQuoteHref?: string }).ctaQuoteHref || '', '/contact');
  const slides = content?.slides || [
    { image: "/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6821-Bearbeitet.jpg", position: "center 13%" },
    { image: "/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6699.jpg", position: "center 45%" },
    { image: "/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6709.jpg", position: "center 35%" },
    { image: "/images/Europaplatz_Fotos/_DSC6714.jpg", position: "center 35%" },
  ];
  return (
    <section className="text-light no-top no-bottom relative rounded-1 overflow-hidden mt-80 mt-sm-50 mx-2 hero-section">
      <div className="mh-800">
        <div className="abs bottom-10 w-100 p-5 mt-3 z-3">
          <div className="container-fluid">
            <div className="row g-4 justify-content-between align-items-end">
              <div className="col-md-10 offset-md-1">
                <div className="hero-intro">
                  <div className="hero-logo">
                    <img src="/images/meri/meri-herosection-logo.svg" alt="Meri Boarding Group" />
                  </div>
                  <h1 className="fs-96 lh-1 fs-xs-10vw mb-0">
                    {t.titleLead} <span>{t.titleHighlight}</span> {t.titleTail}
                  </h1>
                </div>
              </div>
              <div className="col-md-7 offset-md-1">
                <div className="hero-copy-shell">
                  <p className="hero-copy mb-0">{t.description}</p>
                </div>
                <div className="hero-cta-row d-flex align-items-center gap-3 flex-wrap">
                  <Link
                    href={locationsHref}
                    className="btn-main fx-slide hover-white"
                  >
                    <span>{t.ctaLocations}</span>
                  </Link>
                  <Link
                    href={quoteHref}
                    className="btn-main btn-hero-quote fx-slide hover-white"
                    data-hover={t.ctaQuote}
                  >
                    <span>{t.ctaQuote}</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="swiper hero-swiper">
          <div className="swiper-wrapper">
            {slides.map((slide) => (
              <div className="swiper-slide text-light" key={slide.image}>
                <div
                  className="swiper-inner"
                  data-bgimage={`url(${slide.image})`}
                  data-bgposition={slide.position}
                  style={{
                    backgroundImage: `url(${slide.image})`,
                    backgroundPosition: slide.position,
                  }}
                >
                  <div className="sw-overlay op-5"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="swiper-pagination"></div>
        </div>
      </div>
    </section>
  );
}
