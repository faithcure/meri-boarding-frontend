import ContactDetails from "@/components/meri/ContactDetails";
import ContactForm from "@/components/meri/ContactForm";
import type { Locale } from "@/i18n/getLocale";

type ContactContentProps = {
  locale?: Locale;
};

export default function ContactContent({ locale }: ContactContentProps = {}) {
  return (
    <section className="relative">
      <div className="container">
        <div className="row align-items-center justify-content-center">
          <ContactDetails locale={locale} />
          <ContactForm locale={locale} />
        </div>
      </div>
    </section>
  );
}
