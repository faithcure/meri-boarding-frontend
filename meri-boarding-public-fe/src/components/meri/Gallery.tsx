import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { getMessages } from "@/i18n/messages";
import type { HomeResolvedContent } from "@/lib/homeContentApi";

type GalleryProps = {
  locale?: Locale;
  content?: HomeResolvedContent["gallery"];
};

export default async function Gallery({ locale: localeProp, content }: GalleryProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const base = getMessages(locale).gallery;
  const t = {
    ...base,
    items: content?.items || []
  };

  return (
    <section className="bg-color-op-1 rounded-1 mx-2">
      <div className="container">
        <div className="row g-4 gx-5 align-items-center justify-content-between">
          <div className="col-lg-6">
            <div className="subtitle wow fadeInUp" data-wow-delay=".0s">{t.subtitle}</div>
            <h2 className="wow fadeInUp" data-wow-delay=".2s">{t.title}</h2>
          </div>
          <div className="col-lg-6">
            <p className="wow fadeInUp" data-wow-delay=".4s">{t.description}</p>
          </div>
        </div>

        <div className="spacer-single"></div>

        <div className="row">
          <div className="col-md-12 text-center">
            <ul id="filters" className="wow fadeInUp" data-wow-delay="0s">
              <li><a href="#" data-filter="*" className="selected">{t.filters.all}</a></li>
              <li><a href="#" data-filter=".rooms">{t.filters.rooms}</a></li>
              <li><a href="#" data-filter=".dining">{t.filters.dining}</a></li>
              <li><a href="#" data-filter=".facilities">{t.filters.facilities}</a></li>
            </ul>
          </div>
        </div>

        <div id="gallery" className="row g-3 wow fadeIn" data-wow-delay=".3s">
          {(t.items || []).map((item, index) => (
            <div className={`col-md-3 col-sm-6 col-12 item ${item.category}`} key={`${item.image}-${index}`}>
              <a href={item.image} className="image-popup d-block hover">
                <div className="relative overflow-hidden rounded-1 media-frame">
                  <div className="absolute start-0 w-100 hover-op-1 p-5 abs-middle z-3 text-center text-white">{t.view}</div>
                  <div className="absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2"></div>
                  <img src={item.image} className="w-100 hover-scale-1-2" alt={item.alt || ""} />
                </div>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
