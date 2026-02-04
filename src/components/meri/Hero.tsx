import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { getMessages } from "@/i18n/messages";
import Link from "next/link";

type HeroProps = {
  locale?: Locale;
};

export default async function Hero({ locale: localeProp }: HeroProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const t = getMessages(locale).hero;
  const withLocale = (path: string) => localePath(locale, path);
  const slides = [
    {
      image: "/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6821-Bearbeitet.jpg",
      position: "center 13%",
    },
    {
      image: "/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6699.jpg",
      position: "center 45%",
    },
    {
      image: "/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6709.jpg",
      position: "center 35%",
    },
    {
      image: "/images/Europaplatz_Fotos/_DSC6714.jpg",
      position: "center 35%",
    },
  ];
  return (
    <section className="text-light no-top no-bottom relative rounded-1 overflow-hidden mt-80 mt-sm-50 mx-2 hero-section">
      <div className="mh-800">
        <div className="abs bottom-10 w-100 p-5 mt-3 z-3">
          <div className="container-fluid">
            <div className="row g-4 justify-content-between align-items-end">
              <div className="col-md-10 offset-md-1">
                <div className="hero-logo wow fadeInUp">
                  <img src="/images/meri/meri-herosection-logo.svg" alt="Meri Boarding Group" />
                </div>
                <h1 className="fs-96 lh-1 fs-xs-10vw wow fadeInUp mb-2">
                  {t.titleLead} <span>{t.titleHighlight}</span> {t.titleTail}
                </h1>
              </div>
              <div className="col-md-6 offset-md-1">
                <p className="col-md-8 text-white wow fadeInUp" data-wow-delay=".4s">
                  {t.description}
                </p>
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <Link
                    href={withLocale("/hotels")}
                    className="btn-main fx-slide hover-white wow fadeInUp"
                    data-wow-delay=".8s"
                  >
                    <span>{t.ctaLocations}</span>
                  </Link>
                  <Link
                    href={withLocale("/contact")}
                    className="btn-main btn-hero-quote fx-slide hover-white wow fadeInUp"
                    data-wow-delay=".9s"
                    data-hover={t.ctaQuote}
                  >
                    <span>{t.ctaQuote}</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="swiper">
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
