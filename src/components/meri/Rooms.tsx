import AmenityCard from "./AmenityCard";
import { getAmenityCards } from "./amenitiesData";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { getMessages } from "@/i18n/messages";
import Link from "next/link";

type RoomsProps = {
  locale?: Locale;
};

export default async function Rooms({ locale: localeProp }: RoomsProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const t = getMessages(locale).rooms;
  const primaryCards = getAmenityCards(locale).slice(0, 4);
  const withLocale = (path: string) => localePath(locale, path);

  return (
    <section>
      <div className="container">
        <div className="row g-4 mb-4 justify-content-center">
          <div className="col-lg-6 text-center">
            <div className="subtitle mb-0 id-color wow fadeInUp" data-wow-delay=".0s">
              {t.subtitle}
            </div>
            <h2 className="wow fadeInUp" data-wow-delay=".2s">{t.title}</h2>
            <p className="cwow fadeInUp" data-wow-delay=".4s">
              {t.description}
            </p>
          </div>
        </div>

        <div className="row g-4">
          {primaryCards.map((card) => (
            <div className="col-md-6" key={card.title}>
              <AmenityCard card={card} contactHref={withLocale("/contact")} />
            </div>
          ))}

          <div className="col-lg-12 text-center">
            <div className="d-flex align-items-center justify-content-center gap-3 flex-wrap">
              <Link
                href={withLocale("/amenities")}
                className="btn-main fx-slide btn-cta-pulse btn-cta-solid"
                data-hover={t.allAmenities}
              >
                <span>
                  {t.allAmenities} <i className="fa fa-arrow-right ms-2" aria-hidden="true"></i>
                </span>
              </Link>
              <Link
                href={withLocale("/contact")}
                className="btn-main fx-slide btn-slide-soft"
                data-hover={t.request}
              >
                <span>{t.request}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
