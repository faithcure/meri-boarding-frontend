import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { getMessages } from "@/i18n/messages";
import Link from "next/link";

type ServicesContentProps = {
  locale?: Locale;
};

export default async function ServicesContent({ locale: localeProp }: ServicesContentProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const t = getMessages(locale).servicesContent;
  const withLocale = (path: string) => localePath(locale, path);
  return (
    <>
      <section>
        <div className="container">
          <div className="row g-4 align-items-center">
            <div className="col-lg-6">
              <div className="subtitle id-color wow fadeInUp" data-wow-delay=".0s">
                {t.heroSubtitle}
              </div>
              <h2 className="wow fadeInUp" data-wow-delay=".2s">
                {t.heroTitle}
              </h2>
              <p className="wow fadeInUp" data-wow-delay=".4s">
                {t.heroDescription}
              </p>
              <div className="spacer-single"></div>
              <div className="d-flex flex-wrap gap-3">
                <Link className="btn-main btn-cta-solid fx-slide" href={withLocale("/reservation")}>
                  <span>{t.ctaAvailability}</span>
                </Link>
                <Link className="btn-main btn-slide-soft fx-slide" href={withLocale("/contact")}>
                  <span>{t.ctaContact}</span>
                </Link>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="row g-4">
                {t.stats.map((stat) => (
                  <div className="col-md-6" key={stat.label}>
                    <div className="p-30 bg-white rounded-1 h-100">
                      <small className="text-uppercase border-bottom d-block">{stat.label}</small>
                      <div className="spacer-single"></div>
                      <h3 className="mb-2">{stat.value}</h3>
                      <div className="text-muted">{stat.note}</div>
                    </div>
                  </div>
                ))}
                <div className="col-md-6">
                  <div
                    className="p-30 bg-dark-2 rounded-1 h-100"
                    data-bgimage="url(/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6639.jpg) center"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-color-op-1 rounded-1 mx-2">
        <div className="container">
          <div className="row g-4 mb-2 justify-content-center">
            <div className="col-lg-6 text-center">
              <div className="subtitle id-color wow fadeInUp">{t.essentialsSubtitle}</div>
              <h2 className="wow fadeInUp" data-wow-delay=".2s">
                {t.essentialsTitle}
              </h2>
            </div>
          </div>

          <div className="row g-4">
            {t.highlights.map((item, index) => (
              <div className="col-lg-3 col-md-6 wow fadeInUp" data-wow-delay={`.${index + 1}s`} key={item.title}>
                <div className="p-30 bg-white rounded-1 h-100">
                  <div className="mb-3">
                    <i className={`${item.icon} fs-28 p-3 bg-color text-light rounded-1`}></i>
                  </div>
                  <h4 className="mb-2">{item.title}</h4>
                  <p className="mb-0">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="row g-4 align-items-start">
            <div className="col-lg-5">
              <div className="subtitle id-color wow fadeInUp">{t.supportSubtitle}</div>
              <h2 className="wow fadeInUp" data-wow-delay=".2s">
                {t.supportTitle}
              </h2>
              <p className="wow fadeInUp" data-wow-delay=".4s">
                {t.supportDescription}
              </p>
              <div className="spacer-single"></div>
              <Link className="btn-main btn-cta-solid fx-slide" href={withLocale("/reservation")}>
                <span>{t.ctaStart}</span>
              </Link>
            </div>
            <div className="col-lg-7">
              <div className="row g-3">
                {t.supportList.map((item) => (
                  <div className="col-md-6" key={item}>
                    <div className="p-30 bg-white rounded-1 h-100">
                      <div className="d-flex align-items-start gap-2 service-support-item">
                        <i className="fa fa-check text-success mt-1"></i>
                        <div className="service-support-text">{item}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
