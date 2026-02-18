import BookingInquiryForm from "@/components/meri/BookingInquiryForm";
import BuyNow from "@/components/meri/BuyNow";
import Footer from "@/components/meri/Footer";
import Header from "@/components/meri/Header";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { fetchReservationResolvedContent } from "@/lib/reservationContentApi";
import Link from "next/link";

type ReservationPageProps = {
  params?: { locale?: Locale } | Promise<{ locale?: Locale }>;
};

export default async function ReservationPage({ params }: ReservationPageProps = {}) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale ?? (await getLocale());
  const t = await fetchReservationResolvedContent(locale);
  const withLocale = (path: string) => localePath(locale, path);
  const renderLines = (value: string) => {
    const lines = String(value || "").split("\n");
    return lines.map((line, index) => (
      <span key={`${line}-${index}`}>
        {line}
        {index < lines.length - 1 ? <br /> : null}
      </span>
    ));
  };
  return (
    <>
      <Header locale={locale} />
      <main>
        <a href="#" id="back-to-top"></a>

        <section className="jarallax text-light relative rounded-1 overflow-hidden mt-80 mt-sm-70 mx-2">
          <div className="de-gradient-edge-top"></div>
          <img src={t.hero.backgroundImage} className="jarallax-img" alt="" />
          <div className="container relative z-2">
            <div className="row justify-content-center">
              <div className="col-lg-7 text-center">
                <div className="subtitle id-color wow fadeInUp mb-2">{t.hero.subtitle}</div>
                <div className="clearfix"></div>
                <h2 className="fs-60 fs-xs-8vw wow fadeInUp" data-wow-delay=".4s">
                  {t.hero.title}
                </h2>
                <p className="cwow fadeInUp" data-wow-delay=".5s">
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
            <div className="row g-4 gx-5">
              <div className="col-lg-7">
                <div className="p-40 bg-white rounded-1 shadow-soft">
                  <div className="subtitle id-color">{t.shortStay.subtitle}</div>
                  <h3 className="mt-2 mb-3">{t.shortStay.title}</h3>
                  <p className="mb-4">{t.shortStay.description}</p>
                  <form name="shortStayForm" id="short_stay_form" method="post" action={t.form.action}>
                    <div className="row g-4 align-items-end">
                      <div className="col-md-6">
                        <div className="fs-18 text-dark fw-500 mb-10">{t.form.checkIn}</div>
                        <input type="text" id="checkin" className="form-control" required />
                      </div>

                      <div className="col-md-6">
                        <div className="fs-18 text-dark fw-500 mb-10">{t.form.checkOut}</div>
                        <input type="text" id="checkout" className="form-control" required />
                      </div>

                      <div className="col-md-6">
                        <div className="fs-18 text-dark fw-500 mb-10">{t.form.boarding}</div>
                        <select name="boarding_house" className="form-control" required>
                          <option value="">{t.form.select}</option>
                          {t.form.boardingOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-3">
                        <div className="fs-18 text-dark fw-500 mb-10">{t.form.rooms}</div>
                        <select name="rooms" className="form-control" required>
                          {t.form.roomOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-3">
                        <div className="fs-18 text-dark fw-500 mb-10">{t.form.guests}</div>
                        <select name="guests" className="form-control" required>
                          {t.form.guestOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-12">
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
                  <div className="mt-3">
                    <small>{t.shortStay.helper}</small>
                  </div>
                </div>

                <div className="spacer-single"></div>

                <div className="p-4 bg-color-op-1 rounded-1 long-stay-card">
                  <div className="bg-color text-white rounded-circle d-inline-flex align-items-center justify-content-center w-50px h-50px long-stay-icon">
                    <i className="fa fa-briefcase" aria-hidden="true"></i>
                  </div>
                  <div className="long-stay-content">
                    <h4 className="mb-2">{t.longStay.title}</h4>
                    <p className="mb-3">{t.longStay.description}</p>
                    <ul className="ul-check mb-3">
                      {t.longStay.bullets.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <div className="long-stay-actions">
                      <a
                        href="#long-stay-inquiry"
                        className="btn-main fx-slide hover-white"
                        data-hover={t.longStay.ctaQuote}
                      >
                        <span>{t.longStay.ctaQuote}</span>
                      </a>
                      <Link
                        href={withLocale("/contact")}
                        className="btn-main btn-light-trans fx-slide hover-white"
                        data-hover={t.longStay.ctaContact}
                      >
                        <span>{t.longStay.ctaContact}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

                <div className="col-lg-5">
                  <div className="p-40 bg-dark-2 text-light rounded-1">
                    <h3 className="mb-3">{t.help.title}</h3>
                    <p>{t.help.description}</p>
                    <div className="fs-15">
                      {t.help.contacts.map((item) => (
                        <div className="d-flex align-items-center mb-2" key={`${item.icon}-${item.value}`}>
                          <i className={`${item.icon} me-2`} aria-hidden="true"></i>
                          <span>{renderLines(item.value)}</span>
                        </div>
                      ))}
                      <div className="mt-4">
                        <div className="fw-bold">{t.help.hoursTitle}</div>
                        <div>{t.help.hoursDay}</div>
                        {t.help.hours.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                <div className="p-40 bg-white rounded-1 mt-4">
                  <h4 className="mb-3">{t.why.title}</h4>
                  <ul className="ul-check mb-0">
                    {t.why.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div id="long-stay-inquiry">
          <BookingInquiryForm locale={locale} content={t.inquiry} />
        </div>
      </main>
      <Footer locale={locale} />
      <BuyNow />
    </>
  );
}
