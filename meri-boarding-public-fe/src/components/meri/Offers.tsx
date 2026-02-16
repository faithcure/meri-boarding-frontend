import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { getMessages } from "@/i18n/messages";
import Link from "next/link";

type OffersProps = {
  locale?: Locale;
};

export default async function Offers({ locale: localeProp }: OffersProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const t = getMessages(locale).offers;
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
          <div className="col-lg-4 wow fadeInUp" data-wow-delay=".2s">
            <div className="overflow-hidden rounded-1">
              <div className="hover relative media-frame">
                {t.cards[0].badge ? (
                  <h3 className="abs bg-color rounded-3 text-white fs-20 lh-1 p-2 px-3 m-4 top-0 start-0 z-3">
                    {t.cards[0].badge}
                  </h3>
                ) : null}
                <img src="/images/Europaplatz_Fotos/_DSC6629.jpg" className="w-100 hover-scale-1-1" alt="" />
                <Link
                  href={withLocale("/offer-single")}
                  className="d-block abs w-100 h-100 top-0 start-0"
                  aria-label={t.cards[0].title}
                />
              </div>
              <div className="p-40 bg-dark-2 text-light relative">
                <Link className="text-white" href={withLocale("/offers")}>
                  <h3>{t.cards[0].title}</h3>
                  <p>{t.cards[0].text}</p>
                </Link>
              </div>
            </div>
          </div>

          <div className="col-lg-4 wow fadeInUp" data-wow-delay=".4s">
            <div className="overflow-hidden rounded-1">
              <div className="p-40 bg-dark-2 text-light relative">
                <Link className="text-white" href={withLocale("/offers")}>
                  <h3>{t.cards[1].title}</h3>
                  <p>{t.cards[1].text}</p>
                </Link>
              </div>
              <div className="hover relative media-frame">
                {t.cards[1].badge ? (
                  <h3 className="abs bg-color rounded-3 text-white fs-20 lh-1 p-2 px-3 m-4 bottom-0 start-0 z-3">
                    {t.cards[1].badge}
                  </h3>
                ) : null}
                <img src="/images/Europaplatz_Fotos/_DSC6634.jpg" className="w-100 hover-scale-1-1" alt="" />
                <Link
                  href={withLocale("/offer-single")}
                  className="d-block abs w-100 h-100 top-0 start-0"
                  aria-label={t.cards[1].title}
                />
              </div>
            </div>
          </div>

          <div className="col-lg-4 wow fadeInUp" data-wow-delay=".6s">
            <div className="overflow-hidden rounded-1">
              <div className="hover relative media-frame">
                <img src="/images/Europaplatz_Fotos/_DSC6639.jpg" className="w-100 hover-scale-1-1" alt="" />
                <Link
                  href={withLocale("/offer-single")}
                  className="d-block abs w-100 h-100 top-0 start-0"
                  aria-label={t.cards[2].title}
                />
              </div>
              <div className="p-40 bg-dark-2 text-light relative">
                <Link className="text-white" href={withLocale("/offers")}>
                  <h3>{t.cards[2].title}</h3>
                  <p>{t.cards[2].text}</p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
