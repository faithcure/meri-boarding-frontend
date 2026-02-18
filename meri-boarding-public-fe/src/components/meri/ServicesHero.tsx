import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { getMessages } from "@/i18n/messages";
import type { ServicesResolvedContent } from "@/lib/servicesContentApi";
import Link from "next/link";

type ServicesHeroProps = {
  locale?: Locale;
  content?: ServicesResolvedContent["hero"];
};

export default async function ServicesHero({ locale: localeProp, content }: ServicesHeroProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const fallback = getMessages(locale).servicesHero;
  const t = {
    subtitle: String(content?.subtitle || fallback.subtitle || ""),
    title: String(content?.title || fallback.title || ""),
    home: String(content?.home || fallback.home || ""),
    crumb: String(content?.crumb || fallback.crumb || ""),
    backgroundImage: String(content?.backgroundImage || "/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg"),
  };
  const withLocale = (path: string) => localePath(locale, path);
  return (
    <section className="jarallax text-light relative rounded-1 overflow-hidden mt-80 mt-sm-70 mx-2">
      <div className="de-gradient-edge-top"></div>
      <img src={t.backgroundImage} className="jarallax-img" alt="" />
      <div className="container relative z-2">
        <div className="row justify-content-center">
          <div className="col-lg-6 text-center">
            <div className="subtitle id-color wow fadeInUp mb-2">{t.subtitle}</div>
            <div className="clearfix"></div>
            <h2 className="fs-60 fs-xs-8vw wow fadeInUp" data-wow-delay=".4s">
              {t.title}
            </h2>
          </div>
        </div>
      </div>
      <div className="crumb-wrapper">
        <ul className="crumb">
              <li>
                <Link href={withLocale("/")}>{t.home}</Link>
              </li>
          <li className="active">{t.crumb}</li>
        </ul>
      </div>
      <div className="sw-overlay op-8"></div>
    </section>
  );
}
