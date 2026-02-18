import ContactDetails from "@/components/meri/ContactDetails";
import ContactForm from "@/components/meri/ContactForm";
import type { Locale } from "@/i18n/getLocale";
import type { ContactResolvedContent } from "@/lib/contactContentApi";

type ContactContentProps = {
  locale?: Locale;
  content?: Pick<ContactResolvedContent, "details" | "form">;
};

export default function ContactContent({ locale, content }: ContactContentProps = {}) {
  return (
    <section className="relative">
      <div className="container">
        <div className="row align-items-center justify-content-center">
          <ContactDetails locale={locale} content={content?.details} />
          <ContactForm locale={locale} content={content?.form} />
        </div>
      </div>
    </section>
  );
}
