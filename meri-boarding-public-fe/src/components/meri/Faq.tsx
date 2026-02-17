import { Fragment } from "react";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import type { HomeResolvedContent } from "@/lib/homeContentApi";
import Link from "next/link";

type FaqProps = {
  locale?: Locale;
  content?: HomeResolvedContent["faq"];
};

export default async function Faq({ locale: localeProp, content }: FaqProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const t = {
    subtitle: String(content?.subtitle || ""),
    title: String(content?.title || ""),
    cta: String(content?.cta || ""),
    items: content?.items || []
  };
  const withLocale = (path: string) => localePath(locale, path);
  return (
    <section>
      <div className="container">
        <div className="row g-4 gx-5 justify-content-center">
          <div className="col-lg-6">
            <div className="subtitle id-color">{t.subtitle}</div>
            <h2 className="wow fadeInUp">{t.title}</h2>
            <Link href={withLocale("/contact")} className="btn-main fx-slide hover-white mt-4">
              <span>{t.cta}</span>
            </Link>
          </div>

          <div className="col-lg-6">
            <div className="accordion title-boxed wow fadeInUp">
              <div className="accordion-section">
                {t.items.map((item, index) => {
                  const tabId = `accordion-b${index + 1}`;
                  return (
                    <Fragment key={item.title}>
                      <div className="accordion-section-title" data-tab={`#${tabId}`}>
                        {item.title}
                      </div>
                      <div className="accordion-section-content" id={tabId}>
                        <p className="mb-0">{item.body}</p>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
