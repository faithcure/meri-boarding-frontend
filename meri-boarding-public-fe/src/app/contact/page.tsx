import BuyNow from "@/components/meri/BuyNow";
import BookingInquiryForm from "@/components/meri/BookingInquiryForm";
import ContactContent from "@/components/meri/ContactContent";
import ContactHero from "@/components/meri/ContactHero";
import Footer from "@/components/meri/Footer";
import Header from "@/components/meri/Header";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { fetchContactResolvedContent } from "@/lib/contactContentApi";

type ContactPageProps = {
  params?: { locale?: Locale } | Promise<{ locale?: Locale }>;
};

export default async function ContactPage({ params }: ContactPageProps = {}) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale ?? (await getLocale());
  const content = await fetchContactResolvedContent(locale);
  return (
    <>
      <Header locale={locale} />
      <main>
        <a href="#" id="back-to-top"></a>
        <ContactHero locale={locale} content={content.hero} />
        <ContactContent locale={locale} content={{ details: content.details, form: content.form }} />
        <BookingInquiryForm locale={locale} />
      </main>
      <Footer locale={locale} />
      <BuyNow />
    </>
  );
}
