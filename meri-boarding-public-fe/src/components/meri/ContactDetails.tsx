import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { getMessages } from "@/i18n/messages";

type ContactDetailsProps = {
  locale?: Locale;
};

export default async function ContactDetails({ locale: localeProp }: ContactDetailsProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const t = getMessages(locale).contactDetails;
  const contactItems = [
    {
      icon: "icofont-location-pin",
      title: t.address,
      value: (
        <>
          Flamingoweg 70
          <br />
          D-70378 Stuttgart
        </>
      ),
    },
    {
      icon: "icofont-envelope",
      title: t.email,
      value: "info@meri-boarding.de",
    },
    {
      icon: "icofont-phone",
      title: t.phone,
      value: "+49 (0) 711 54 89 84 - 0",
    },
    {
      icon: "icofont-brand-whatsapp",
      title: t.whatsapp,
      value: "+49 (0) 152 06419253",
    },
  ];
  return (
    <div className="col-lg-6">
      <div className="subtitle">{t.subtitle}</div>
      <h2 className="wow fadeInUp">{t.title}</h2>

      <p className="col-lg-8">{t.description}</p>

      <div className="spacer-single"></div>

      <div className="row g-4">
        {contactItems.map((item) => (
          <div className="col-md-6" key={item.title}>
            <i className={`abs fs-28 p-3 bg-color text-light rounded-1 ${item.icon}`}></i>
            <div className="ms-80px">
              <h3 className="fs-20 mb-0">{item.title}</h3>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div className="contact-socials mt-4">
        <a className="contact-social" href="#" aria-label="Instagram">
          <i className="fa-brands fa-instagram"></i>
        </a>
        <a className="contact-social" href="#" aria-label="LinkedIn">
          <i className="fa-brands fa-linkedin-in"></i>
        </a>
      </div>
    </div>
  );
}
