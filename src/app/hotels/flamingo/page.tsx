import BuyNow from "@/components/meri/BuyNow";
import Footer from "@/components/meri/Footer";
import Header from "@/components/meri/Header";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { getMessages } from "@/i18n/messages";
import Link from "next/link";

type FlamingoHotelPageProps = {
  params?: { locale?: Locale } | Promise<{ locale?: Locale }>;
};

export default async function FlamingoHotelPage({ params }: FlamingoHotelPageProps = {}) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale ?? (await getLocale());
  const t = getMessages(locale).hotelDetail.flamingo;
  const withLocale = (path: string) => localePath(locale, path);

  return (
    <>
      <Header locale={locale} />
      <main>
        <a href="#" id="back-to-top"></a>

        <section className="jarallax text-light relative rounded-1 overflow-hidden mt-80 mt-sm-70 mx-2">
          <div className="de-gradient-edge-top"></div>
          <img src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg" className="jarallax-img" alt="" />
          <div className="container relative z-2">
            <div className="row justify-content-center">
              <div className="col-lg-7 text-center">
                <div className="subtitle id-color wow fadeInUp mb-2">{t.heroSubtitle}</div>
                <div className="clearfix"></div>
                <h2 className="fs-60 fs-xs-8vw wow fadeInUp" data-wow-delay=".4s">
                  {t.heroTitle}
                </h2>
              </div>
            </div>
          </div>
          <div className="crumb-wrapper">
            <ul className="crumb">
              <li>
                <Link href={withLocale("/")}>{t.crumb.home}</Link>
              </li>
              <li>
                <Link href={withLocale("/hotels")}>{t.crumb.hotels}</Link>
              </li>
              <li className="active">{t.crumb.current}</li>
            </ul>
          </div>
          <div className="sw-overlay op-8"></div>
        </section>

        <section>
          <div className="container">
            <div className="row g-4 gx-5">
              <div className="col-lg-12">
                <div className="p-4 fs-18 rounded-1 bg-color-op-1 d-lg-flex d-sm-block flex-wrap align-items-center justify-content-between gap-4 mb-4 fw-500">
                  {t.facts.map((fact) => (
                    <div className="me-4 d-lg-block py-2 d-sm-inline-block relative lh-1-3 ps-30" key={fact.label}>
                      <i className={`abs start-0 ${fact.icon}`} aria-hidden="true"></i>
                      {fact.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-lg-8">
                <div className="owl-custom-nav menu-float" data-target="#flamingo-carousel">
                  <a className="btn-next"></a>
                  <a className="btn-prev"></a>

                  <div id="flamingo-carousel" className="owl-single-static owl-carousel owl-theme">
                    <div className="item">
                      <div className="relative">
                        <div className="overflow-hidden rounded-1 media-frame">
                          <img
                            src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6699.jpg"
                            className="w-100"
                            alt="Flamingo boardinghouse living area"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="item">
                      <div className="relative">
                        <div className="overflow-hidden rounded-1 media-frame">
                          <img
                            src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6744.jpg"
                            className="w-100"
                            alt="Flamingo boardinghouse bedroom"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="item">
                      <div className="relative">
                        <div className="overflow-hidden rounded-1 media-frame">
                          <img
                            src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6754.jpg"
                            className="w-100"
                            alt="Flamingo boardinghouse kitchen"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="item">
                      <div className="relative">
                        <div className="overflow-hidden rounded-1 media-frame">
                          <img
                            src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6756.jpg"
                            className="w-100"
                            alt="Flamingo boardinghouse details"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="spacer-single"></div>
                {t.description.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}

                <h3 className="mt-4 mb-3">{t.amenitiesTitle}</h3>
                <div className="row">
                  <div className="col-md-6">
                    <ul className="ul-check">
                      {t.highlights.slice(0, 7).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <ul className="ul-check">
                      {t.highlights.slice(7).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="p-40 bg-white rounded-1 mb-4" id="booking">
                  <form name="contactForm" id="contact_form" method="post" action="#">
                    <div className="row g-4 align-items-end">
                      <div className="col-lg-12">
                        <div className="fs-18 text-dark fw-500 mb-10">{t.form.checkIn}</div>
                        <input type="text" id="checkin" className="form-control" required />
                      </div>

                      <div className="col-lg-12">
                        <div className="fs-18 text-dark fw-500 mb-10">{t.form.checkOut}</div>
                        <input type="text" id="checkout" className="form-control" required />
                      </div>

                      <div className="col-md-6">
                        <div className="fs-18 text-dark fw-500 mb-10">{t.form.rooms}</div>
                        <select name="rooms" id="rooms" className="form-control">
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                          <option value="6">6</option>
                          <option value="7">7</option>
                          <option value="8">8</option>
                          <option value="9">9</option>
                          <option value="10">10</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <div className="fs-18 text-dark fw-500 mb-10">{t.form.guests}</div>
                        <select name="guests" id="guests" className="form-control">
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                          <option value="6">6</option>
                          <option value="7">7</option>
                          <option value="8">8</option>
                          <option value="9">9</option>
                          <option value="10">10</option>
                        </select>
                      </div>

                      <div className="col-lg-12">
                        <div id="submit">
                          <input
                            type="submit"
                            id="send_message"
                            value={t.form.availability}
                            className="btn-main w-100"
                          />
                        </div>
                      </div>
                    </div>
                  </form>

                  <div className="mt-4">
                    <small>{t.form.riskFree}</small>
                  </div>
                </div>

                <div className="p-40 bg-white rounded-1">
                  <h3 className="mb-3">{t.location.title}</h3>
                  <div className="fs-15">
                    <div className="d-flex align-items-start mb-2">
                      <i className="fa fa-map-marker id-color me-2 mt-1" aria-hidden="true"></i>
                      <div>
                        Meri Boarding Group GmbH
                        <br />
                        Flamingoweg 70
                        <br />
                        D-70378 Stuttgart
                      </div>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <i className="fa fa-phone id-color me-2" aria-hidden="true"></i>
                      <span>+49 (0) 711 54 89 84 - 0</span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <i className="fa fa-whatsapp id-color me-2" aria-hidden="true"></i>
                      <span>+49 (0) 152 06419253</span>
                    </div>
                    <div className="d-flex align-items-center mb-3">
                      <i className="fa fa-envelope id-color me-2" aria-hidden="true"></i>
                      <span>info@meri-boarding.de</span>
                    </div>
                    <div className="mb-4">
                      <div className="fw-bold">{t.location.hoursTitle}</div>
                      <div>{t.location.hoursDay}</div>
                      <div>08:00 - 12:00</div>
                      <div>13:00 - 17:00</div>
                    </div>
                    <Link href={withLocale("/contact")} className="btn-main fx-slide hover-white w-100">
                      <span>{t.location.cta}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="spacer-single"></div>

            <div className="row">
              <div className="col-md-12 text-center">
                <ul id="filters" className="wow fadeInUp" data-wow-delay="0s">
                  <li>
                    <a href="#" data-filter="*" className="selected">
                      {t.gallery.all}
                    </a>
                  </li>
                  <li>
                    <a href="#" data-filter=".rooms">
                      {t.gallery.rooms}
                    </a>
                  </li>
                  <li>
                    <a href="#" data-filter=".dining">
                      {t.gallery.dining}
                    </a>
                  </li>
                  <li>
                    <a href="#" data-filter=".facilities">
                      {t.gallery.facilities}
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div id="gallery" className="row g-3 wow fadeIn" data-wow-delay=".3s">
              {[
                { src: "/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6821-Bearbeitet.jpg", category: "rooms" },
                { src: "/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6844.jpg", category: "dining" },
                { src: "/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6846.jpg", category: "facilities" },
                { src: "/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6856-Bearbeitet.jpg", category: "rooms" },
                { src: "/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6861.jpg", category: "dining" },
                { src: "/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6709.jpg", category: "facilities" },
                { src: "/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6716.jpg", category: "rooms" },
                { src: "/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6726.jpg", category: "facilities" }
              ].map((item, index) => (
                <div className={`col-md-3 col-sm-6 col-12 item ${item.category}`} key={item.src}>
                  <a href={item.src} className="image-popup d-block hover">
                    <div className="relative overflow-hidden rounded-1 media-frame">
                      <div className="absolute start-0 w-100 hover-op-1 p-5 abs-middle z-3 text-center text-white">
                        {t.gallery.view}
                      </div>
                      <div className="absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2"></div>
                      <img src={item.src} className="w-100 hover-scale-1-2" alt={`Flamingo gallery ${index + 1}`} />
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
      <BuyNow />
    </>
  );
}
