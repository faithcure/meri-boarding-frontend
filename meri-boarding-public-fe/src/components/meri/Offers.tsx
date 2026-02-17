import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import type { HomeResolvedContent } from "@/lib/homeContentApi";
import Link from "next/link";

type OffersProps = {
  locale?: Locale;
  content?: HomeResolvedContent["offers"];
};

export default async function Offers({ locale: localeProp, content }: OffersProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const cards = (content?.cards || []).map((card, index) => ({
    id: String(card.id || `offer-${index + 1}`),
    badge: String(card.badge || ""),
    title: String(card.title || ""),
    text: String(card.text || ""),
    image: String(card.image || "")
  }));
  const t = {
    subtitle: String(content?.subtitle || ''),
    title: String(content?.title || ''),
    cards
  };
  const fallbackImages = [
    "/images/Europaplatz_Fotos/_DSC6629.jpg",
    "/images/Europaplatz_Fotos/_DSC6634.jpg",
    "/images/Europaplatz_Fotos/_DSC6639.jpg"
  ];
  const withLocale = (path: string) => localePath(locale, path);
  return (
    <section className="bg-color-op-1 rounded-1 mx-2">
      <div className="container">
        <div className="row g-4 mb-2 justify-content-center">
          <div className="col-lg-6 text-center">
            <div className="subtitle id-color wow fadeInUp">{t.subtitle}</div>
            <h2 className="wow fadeInUp" data-wow-delay=".2s">{t.title}</h2>
          </div>
        </div>

        <div className="row g-4">
          {t.cards.map((card, index) => {
            const image = card.image || fallbackImages[index % fallbackImages.length];
            const imageFirst = index !== 1;
            const colClass = t.cards.length >= 4 ? "col-lg-3 col-md-6" : "col-lg-4 col-md-6";
            return (
              <div className={`${colClass} wow fadeInUp`} data-wow-delay={`${0.2 + index * 0.2}s`} key={card.id}>
                <div className="overflow-hidden rounded-1">
                  {imageFirst ? (
                    <>
                      <div className="hover relative media-frame">
                        {card.badge ? (
                          <h3 className={`abs bg-color rounded-3 text-white fs-20 lh-1 p-2 px-3 m-4 ${index % 4 === 2 ? "bottom-0 start-0" : "top-0 start-0"} z-3`}>
                            {card.badge}
                          </h3>
                        ) : null}
                        <img src={image} className="w-100 hover-scale-1-1" alt={card.title || ""} />
                        <Link href={withLocale("/offer-single")} className="d-block abs w-100 h-100 top-0 start-0" aria-label={card.title} />
                      </div>
                      <div className="p-40 bg-dark-2 text-light relative">
                        <Link className="text-white" href={withLocale("/offers")}>
                          <h3>{card.title}</h3>
                          <p>{card.text}</p>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-40 bg-dark-2 text-light relative">
                        <Link className="text-white" href={withLocale("/offers")}>
                          <h3>{card.title}</h3>
                          <p>{card.text}</p>
                        </Link>
                      </div>
                      <div className="hover relative media-frame">
                        {card.badge ? (
                          <h3 className="abs bg-color rounded-3 text-white fs-20 lh-1 p-2 px-3 m-4 bottom-0 start-0 z-3">
                            {card.badge}
                          </h3>
                        ) : null}
                        <img src={image} className="w-100 hover-scale-1-1" alt={card.title || ""} />
                        <Link href={withLocale("/offer-single")} className="d-block abs w-100 h-100 top-0 start-0" aria-label={card.title} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
