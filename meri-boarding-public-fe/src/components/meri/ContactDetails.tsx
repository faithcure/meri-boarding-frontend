import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { getMessages } from "@/i18n/messages";
import type { ContactResolvedContent } from "@/lib/contactContentApi";

type ContactDetailsProps = {
  locale?: Locale;
  content?: ContactResolvedContent["details"];
};

export default async function ContactDetails({ locale: localeProp, content }: ContactDetailsProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const fallback = getMessages(locale).contactDetails;
  const fallbackItems = [
    {
      icon: "icofont-location-pin",
      title: fallback.address,
      value: "Flamingoweg 70\nD-70378 Stuttgart",
    },
    {
      icon: "icofont-envelope",
      title: fallback.email,
      value: "info@meri-boarding.de",
    },
    {
      icon: "icofont-phone",
      title: fallback.phone,
      value: "+49 (0) 711 54 89 84 - 0",
    },
    {
      icon: "icofont-brand-whatsapp",
      title: fallback.whatsapp,
      value: "+49 (0) 152 06419253",
    },
  ];
  const fallbackSocials = [
    { icon: "fa-brands fa-instagram", label: "Instagram", url: "https://www.instagram.com/" },
    { icon: "fa-brands fa-linkedin-in", label: "LinkedIn", url: "https://www.linkedin.com/" },
  ];
  const t = {
    subtitle: String(content?.subtitle || fallback.subtitle || ""),
    title: String(content?.title || fallback.title || ""),
    description: String(content?.description || fallback.description || ""),
    items: Array.isArray(content?.items) ? content.items : fallbackItems,
    socials: Array.isArray(content?.socials) ? content.socials : fallbackSocials,
  };

  const renderValue = (value: string) => {
    const lines = value.split("\n");
    return lines.map((line, index) => (
      <span key={`${line}-${index}`}>
        {line}
        {index < lines.length - 1 ? <br /> : null}
      </span>
    ));
  };

  return (
    <div className="col-lg-6">
      <div className="subtitle">{t.subtitle}</div>
      <h2 className="wow fadeInUp">{t.title}</h2>

      <p className="col-lg-8">{t.description}</p>

      <div className="spacer-single"></div>

      <div className="row g-4">
        {t.items.map((item) => (
          <div className="col-md-6" key={item.title}>
            <i className={`abs fs-28 p-3 bg-color text-light rounded-1 ${item.icon}`}></i>
            <div className="ms-80px">
              <h3 className="fs-20 mb-0">{item.title}</h3>
              <div>{renderValue(String(item.value || ""))}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="contact-socials mt-4">
        {t.socials.map((item) => (
          <a className="contact-social" href={item.url} aria-label={item.label} key={item.label}>
            <i className={item.icon}></i>
          </a>
        ))}
      </div>
    </div>
  );
}
