import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { getMessages } from "@/i18n/messages";
import type { ContactResolvedContent } from "@/lib/contactContentApi";

type ContactFormProps = {
  locale?: Locale;
  content?: ContactResolvedContent["form"];
};

export default async function ContactForm({ locale: localeProp, content }: ContactFormProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const fallback = getMessages(locale).contactForm;
  const t = {
    action: String(content?.action || "https://meri-boarding.de/boarding-booking.php"),
    name: String(content?.name || fallback.name || ""),
    email: String(content?.email || fallback.email || ""),
    phone: String(content?.phone || fallback.phone || ""),
    message: String(content?.message || fallback.message || ""),
    send: String(content?.send || fallback.send || ""),
    success: String(content?.success || fallback.success || ""),
    error: String(content?.error || fallback.error || ""),
    namePlaceholder: String(content?.namePlaceholder || fallback.namePlaceholder || ""),
    emailPlaceholder: String(content?.emailPlaceholder || fallback.emailPlaceholder || ""),
    phonePlaceholder: String(content?.phonePlaceholder || fallback.phonePlaceholder || ""),
    messagePlaceholder: String(content?.messagePlaceholder || fallback.messagePlaceholder || ""),
  };
  return (
    <div className="col-lg-6">
      <div className="bg-color-op-1 rounded-1 p-40 relative">
        <form name="contactForm" id="contact_form" method="post" action={t.action}>
          <div className="row g-4">
            <div className="col-md-6">
              <h3 className="fs-18">{t.name}</h3>
              <input
                type="text"
                name="name"
                id="name"
                className="bg-white form-control"
                placeholder={t.namePlaceholder}
                required
              />
            </div>

            <div className="col-md-6">
              <h3 className="fs-18">{t.email}</h3>
              <input
                type="email"
                name="email"
                id="email"
                className="bg-white form-control"
                placeholder={t.emailPlaceholder}
                required
              />
            </div>

            <div className="col-md-12">
              <h3 className="fs-18">{t.phone}</h3>
              <input
                type="text"
                name="phone"
                id="phone"
                className="bg-white form-control"
                placeholder={t.phonePlaceholder}
                required
              />
            </div>

            <div className="col-md-12">
              <h3 className="fs-18">{t.message}</h3>
              <textarea
                name="message"
                id="message"
                className="bg-white form-control h-100px"
                placeholder={t.messagePlaceholder}
                required
              ></textarea>
            </div>

            <div className="col-md-12">
              <div id="submit">
                <input
                  type="submit"
                  id="send_message"
                  value={t.send}
                  className="btn-main"
                />
              </div>

              <div id="success_message" className="success">
                {t.success}
              </div>
              <div id="error_message" className="error">
                {t.error}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
