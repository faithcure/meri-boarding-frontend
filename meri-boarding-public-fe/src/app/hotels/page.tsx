import BuyNow from "@/components/meri/BuyNow";
import BookingPartnersSection from "@/components/meri/BookingPartnersSection";
import Footer from "@/components/meri/Footer";
import Header from "@/components/meri/Header";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { getMessages } from "@/i18n/messages";
import { fetchHomeResolvedContent } from "@/lib/homeContentApi";
import { fetchPublicHotels } from "@/lib/hotelsApi";
import Link from "next/link";

type HotelFactView = { text: string; icon: string };

type HotelsPageProps = {
  params?: { locale?: Locale } | Promise<{ locale?: Locale }>;
};

export default async function HotelsPage({ params }: HotelsPageProps = {}) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale ?? (await getLocale());
  const t = getMessages(locale).hotels;
  const fallbackHotelImage = "/images/placeholders/room.svg";
  const withApiHost = (url: string) => {
    const value = String(url || "").trim();
    if (!value) return fallbackHotelImage;
    return value;
  };
  const normalizeFact = (input: unknown): HotelFactView => {
    if (typeof input === "string") return { text: input, icon: "fa fa-check" };
    if (input && typeof input === "object") {
      const maybeFact = input as { text?: unknown; icon?: unknown };
      return {
        text: String(maybeFact.text ?? "").trim(),
        icon: String(maybeFact.icon ?? "").trim() || "fa fa-check",
      };
    }
    return { text: "", icon: "fa fa-check" };
  };
  const apiHotels = await fetchPublicHotels(locale);
  const homeContent = await fetchHomeResolvedContent(locale);
  const hotelCards = apiHotels.map((item) => ({
    slug: item.slug,
    image: withApiHost(item.coverImageUrl || fallbackHotelImage),
    name: item.name,
    location: item.location,
    description: item.shortDescription,
    facts: (item.facts || []).map((fact) => normalizeFact(fact)).filter((fact) => Boolean(fact.text)),
    available: item.available !== false,
  }));
  const overviewFacts = t.overviewFacts;
  const sharedHighlights = t.sharedHighlights;
  const staySteps = t.staySteps;
  const withLocale = (path: string) => localePath(locale, path);

  return (
    <>
      <Header locale={locale} />
      <main>
        <a href="#" id="back-to-top"></a>

        <section className="jarallax text-light relative rounded-1 overflow-hidden mt-80 mt-sm-70 mx-2">
          <div className="de-gradient-edge-top"></div>
          <img
            src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6821-Bearbeitet.jpg"
            className="jarallax-img"
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          <div className="container relative z-2">
            <div className="row justify-content-center">
              <div className="col-lg-7 text-center">
                <div className="subtitle id-color wow fadeInUp mb-2">{t.hero.subtitle}</div>
                <div className="clearfix"></div>
                <h2 className="fs-60 fs-xs-8vw wow fadeInUp" data-wow-delay=".4s">
                  {t.hero.title}
                </h2>
                <p className="lead wow fadeInUp" data-wow-delay=".6s">
                  {t.hero.description}
                </p>
              </div>
            </div>
          </div>
          <div className="crumb-wrapper">
            <ul className="crumb">
              <li>
                <Link href={withLocale("/")}>{t.crumb.home}</Link>
              </li>
              <li className="active">{t.crumb.current}</li>
            </ul>
          </div>
          <div className="sw-overlay op-8"></div>
        </section>

        <section>
          <div className="container">
            <div className="row g-4 gx-5 align-items-center">
              <div className="col-lg-5">
                <div className="subtitle id-color wow fadeInUp">{t.glance.subtitle}</div>
                <h2 className="wow fadeInUp" data-wow-delay=".2s">
                  {t.glance.title}
                </h2>
                <p className="wow fadeInUp" data-wow-delay=".4s">
                  {t.glance.description}
                </p>
                <Link href={withLocale("/contact")} className="btn-main fx-slide hover-white">
                  <span>{t.glance.cta}</span>
                </Link>
              </div>
              <div className="col-lg-7">
                <div className="p-4 fs-18 rounded-1 bg-color-op-1 d-lg-flex d-sm-block flex-wrap align-items-center justify-content-between gap-4 fw-500">
                  {overviewFacts.map((fact) => (
                    <div
                      className="me-4 d-lg-block py-2 d-sm-inline-block relative lh-1-3 ps-30"
                      key={fact.label}
                    >
                      <i className={`abs start-0 ${fact.icon}`} aria-hidden="true"></i>
                      {fact.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-color-op-1 rounded-1 mx-2">
          <div className="container">
            <div className="row g-4 mb-4 justify-content-center">
              <div className="col-lg-7 text-center">
                <div className="subtitle id-color wow fadeInUp">{t.locations.subtitle}</div>
                <h2 className="wow fadeInUp" data-wow-delay=".2s">
                  {t.locations.title}
                </h2>
                <p className="wow fadeInUp" data-wow-delay=".4s">
                  {t.locations.description}
                </p>
              </div>
            </div>

            <div className="row g-4">
              {hotelCards.map((hotel, index) => (
                <div className="col-lg-12" key={hotel.slug}>
                  <div className="room-item hover p-2 rounded-1 bg-white">
                    <div
                      className={`row g-4 align-items-center ${
                        index % 2 === 1 ? "flex-row-reverse" : ""
                      }`}
                    >
                      <div className="col-lg-5">
                        <div className="overflow-hidden rounded-1 media-frame">
                          <img
                            src={hotel.image}
                            className="w-100 hover-scale-1-1"
                            alt={hotel.name}
                            loading="lazy"
                            fetchPriority="low"
                            decoding="async"
                          />
                        </div>
                      </div>
                      <div className="col-lg-7">
                        <div className="p-4">
                          <div className="d-flex align-items-center gap-3 mb-2">
                            <div className="bg-color text-white rounded-circle d-inline-flex align-items-center justify-content-center w-40px h-40px">
                              <i className="fa fa-building" aria-hidden="true"></i>
                            </div>
                            <div>
                              <div className="fs-14 text-uppercase id-color">{hotel.location}</div>
                              <h3 className="mb-0">Meri Boardinghouse {hotel.name}</h3>
                            </div>
                            <span className={`badge ${hotel.available !== false ? "bg-success" : "bg-warning text-dark"}`}>
                              {hotel.available !== false ? "Available" : "Full"}
                            </span>
                          </div>
                          <p className="mb-3">{hotel.description}</p>
                          <ul className="ul-check mb-4">
                            {hotel.facts.map((fact) => (
                              <li key={fact.text}>
                                <i className={`${fact.icon} me-2`} aria-hidden="true"></i>
                                {fact.text}
                              </li>
                            ))}
                          </ul>
                          <div className="d-flex align-items-center gap-3 flex-wrap">
                            <Link href={withLocale(`/hotels/${hotel.slug}`)} className="btn-main fx-slide hover-white">
                              <span>{t.locations.view}</span>
                            </Link>
                            <Link
                              href={withLocale("/contact")}
                              className="btn-main btn-dark-trans btn-stroke fx-slide hover-white"
                            >
                              <span>{t.locations.request}</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="container">
            <div className="row g-4 align-items-center">
              <div className="col-lg-6">
                <div className="subtitle id-color wow fadeInUp">{t.shared.subtitle}</div>
                <h2 className="wow fadeInUp" data-wow-delay=".2s">
                  {t.shared.title}
                </h2>
                <p className="wow fadeInUp" data-wow-delay=".4s">
                  {t.shared.description}
                </p>
                <ul className="ul-check">
                  {sharedHighlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="col-lg-6">
                <div className="row g-4">
                  {staySteps.map((step) => (
                    <div className="col-md-12" key={step.title}>
                      <div className="p-4 bg-white rounded-1 h-100">
                        <div className="d-flex align-items-center gap-3 mb-2">
                          <div className="bg-color text-white rounded-circle d-inline-flex align-items-center justify-content-center w-40px h-40px">
                            <i className={step.icon} aria-hidden="true"></i>
                          </div>
                          <h4 className="mb-0">{step.title}</h4>
                        </div>
                        <p className="mb-0">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-color rounded-1 mx-2 text-light">
          <div className="container">
            <div className="row g-4 align-items-center">
              <div className="col-lg-8">
                <h2 className="mb-2">{t.cta.title}</h2>
                <p className="mb-0">{t.cta.description}</p>
              </div>
              <div className="col-lg-4 text-lg-end">
                <Link href={withLocale("/contact")} className="btn-main btn-light-trans fx-slide hover-white">
                  <span>{t.cta.button}</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
        <BookingPartnersSection
          partners={homeContent.hero.bookingPartners}
          title={homeContent.hero.bookingPartnersTitle}
          description={homeContent.hero.bookingPartnersDescription}
        />
      </main>
      <Footer locale={locale} />
      <BuyNow />
    </>
  );
}
