import BuyNow from "@/components/meri/BuyNow";
import Footer from "@/components/meri/Footer";
import Header from "@/components/meri/Header";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { getMessages } from "@/i18n/messages";
import Link from "next/link";

export default async function NotFound() {
  const locale = await getLocale();
  const t = getMessages(locale).notFound;
  const withLocale = (path: string) => localePath(locale, path);
  return (
    <>
      <Header locale={locale} />
      <main>
        <a href="#" id="back-to-top"></a>

        <section className="jarallax text-light relative rounded-1 overflow-hidden mt-80 mt-sm-70 mx-2">
          <div className="de-gradient-edge-top"></div>
          <img
            src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6639.jpg"
            className="jarallax-img"
            alt=""
          />
          <div className="container relative z-2">
            <div className="row justify-content-center">
              <div className="col-lg-6 text-center">
                <div className="subtitle id-color wow fadeInUp mb-2">{t.subtitle}</div>
                <div className="clearfix"></div>
                <h2 className="fs-60 fs-xs-8vw wow fadeInUp" data-wow-delay=".4s">
                  {t.title}
                </h2>
                <p className="lead wow fadeInUp" data-wow-delay=".6s">
                  {t.description}
                </p>
              </div>
            </div>
          </div>
          <div className="crumb-wrapper">
            <ul className="crumb">
              <li>
                <Link href={withLocale("/")}>{t.homeCrumb}</Link>
              </li>
              <li className="active">{t.crumb}</li>
            </ul>
          </div>
          <div className="sw-overlay op-8"></div>
        </section>

        <section>
          <div className="container">
            <div className="row g-4 justify-content-center">
              <div className="col-lg-8 text-center">
                <div className="p-40 bg-color-op-1 rounded-1">
                  <h3 className="mb-3">{t.where}</h3>
                  <p className="mb-4">
                    {t.helper}
                  </p>
                  <div className="d-flex align-items-center justify-content-center gap-3 flex-wrap">
                    <Link href={withLocale("/")} className="btn-main fx-slide hover-white">
                      <span>{t.home}</span>
                    </Link>
                    <Link href={withLocale("/hotels")} className="btn-main btn-light-trans fx-slide hover-white">
                      <span>{t.hotels}</span>
                    </Link>
                    <Link href={withLocale("/contact")} className="btn-main btn-light-trans fx-slide hover-white">
                      <span>{t.contact}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
      <BuyNow />
    </>
  );
}
