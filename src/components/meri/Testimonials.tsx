import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { getMessages } from "@/i18n/messages";

type TestimonialsProps = {
  locale?: Locale;
};

export default async function Testimonials({ locale: localeProp }: TestimonialsProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const t = getMessages(locale).testimonials;
  return (
    <section className="text-light jarallax mx-2 rounded-1 overflow-hidden">
      <img src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg" className="jarallax-img" alt="" />
      <div className="sw-overlay op-6"></div>
      <div className="container relative z-2">
        <div className="row g-4 gx-5 align-items-center">
          <div className="col-lg-5 text-center">
            <h2 className="fs-96 mb-0">256</h2>
            <span className="d-block id-color wow fadeInUp">{t.apartments}</span>
            {t.locations}
          </div>
          <div className="col-lg-7">
            <div className="owl-single-dots owl-carousel owl-theme">
              {t.slides.map((slide) => (
                <div className="item" key={slide.badge}>
                  <span className="d-stars id-color d-block mb-3">{slide.badge}</span>
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
