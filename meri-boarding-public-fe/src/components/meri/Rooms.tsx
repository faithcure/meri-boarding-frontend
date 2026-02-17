import AmenityCard from "./AmenityCard";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { getMessages } from "@/i18n/messages";
import type { HomeResolvedContent } from "@/lib/homeContentApi";
import Link from "next/link";

type RoomsProps = {
  locale?: Locale;
  content?: HomeResolvedContent["rooms"];
};

export default async function Rooms({ locale: localeProp, content }: RoomsProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const t = content || getMessages(locale).rooms;
  const primaryCards = (t as typeof t & { cards?: Array<{
    title: string;
    icon: string;
    image: string;
    description: string;
    highlights: string[];
  }> }).cards || [];
  const withLocale = (path: string) => localePath(locale, path);
  const resolveHref = (value: string, fallback: string) => {
    const raw = String(value || '').trim() || fallback;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return withLocale(raw);
    return withLocale(fallback);
  };
  const amenitiesHref = resolveHref((t as typeof t & { allAmenitiesHref?: string }).allAmenitiesHref || "", "/amenities");
  const requestHref = resolveHref((t as typeof t & { requestHref?: string }).requestHref || "", "/contact");

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
              <AmenityCard card={card} contactHref={requestHref} />
            </div>
          ))}

          <div className="col-lg-12 text-center">
            <div className="d-flex align-items-center justify-content-center gap-3 flex-wrap">
              <Link
                href={amenitiesHref}
                className="btn-main fx-slide btn-cta-pulse btn-cta-solid"
                data-hover={t.allAmenities}
              >
                <span>
                  {t.allAmenities} <i className="fa fa-arrow-right ms-2" aria-hidden="true"></i>
                </span>
              </Link>
              <Link
                href={requestHref}
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
