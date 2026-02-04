import BuyNow from "@/components/meri/BuyNow";
import Footer from "@/components/meri/Footer";
import Header from "@/components/meri/Header";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { getMessages } from "@/i18n/messages";
import Link from "next/link";

type ImprintPageProps = {
  params?: { locale?: Locale } | Promise<{ locale?: Locale }>;
};

export default async function ImprintPage({ params }: ImprintPageProps = {}) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale ?? (await getLocale());
  const t = getMessages(locale).imprint;
  const withLocale = (path: string) => localePath(locale, path);

  return (
    <>
      <Header locale={locale} />
      <main>
        <a href="#" id="back-to-top"></a>

        <section className="jarallax text-light relative rounded-1 overflow-hidden mt-80 mt-sm-70 mx-2">
          <div className="de-gradient-edge-top"></div>
          <img
            src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6699.jpg"
            className="jarallax-img"
            alt=""
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
                <Link href={withLocale("/")}>{t.hero.home}</Link>
              </li>
              <li className="active">{t.hero.crumb}</li>
            </ul>
          </div>
          <div className="sw-overlay op-8"></div>
        </section>

        <section>
          <div className="container">
            <div className="row g-4">
              <div className="col-lg-6">
                <div className="p-30 bg-white rounded-1 h-100">
                  <h4 className="mb-2">{t.company.title}</h4>
                  <p className="mb-2">{t.company.name}</p>
                  <p className="mb-0">{t.company.address}</p>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="p-30 bg-white rounded-1 h-100">
                  <h4 className="mb-2">{t.contact.title}</h4>
                  <p className="mb-2">{t.contact.email}</p>
                  <p className="mb-0">{t.contact.phone}</p>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="p-30 bg-white rounded-1 h-100">
                  <h4 className="mb-2">{t.represented.title}</h4>
                  <p className="mb-0">{t.represented.body}</p>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="p-30 bg-white rounded-1 h-100">
                  <h4 className="mb-2">{t.register.title}</h4>
                  <p className="mb-0">{t.register.body}</p>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="p-30 bg-white rounded-1 h-100">
                  <h4 className="mb-2">{t.vat.title}</h4>
                  <p className="mb-0">{t.vat.body}</p>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="p-30 bg-white rounded-1 h-100">
                  <h4 className="mb-2">{t.responsible.title}</h4>
                  <p className="mb-0">{t.responsible.body}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-color-op-1 rounded-1 mx-2">
          <div className="container">
            <div className="row g-4 align-items-center">
              <div className="col-lg-8">
                <h2 className="mb-2">{t.cta.title}</h2>
                <p className="mb-0">{t.cta.body}</p>
              </div>
              <div className="col-lg-4 text-lg-end">
                <Link href={withLocale("/contact")} className="btn-main fx-slide hover-white">
                  <span>{t.cta.button}</span>
                </Link>
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
