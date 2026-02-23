import BuyNow from "@/components/meri/BuyNow";
import BookingInquiryForm from "@/components/meri/BookingInquiryForm";
import BookingPartnersSection from "@/components/meri/BookingPartnersSection";
import ContactContent from "@/components/meri/ContactContent";
import ContactHero from "@/components/meri/ContactHero";
import Footer from "@/components/meri/Footer";
import Header from "@/components/meri/Header";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { fetchContactResolvedContent } from "@/lib/contactContentApi";
import { fetchHomeResolvedContent } from "@/lib/homeContentApi";
import { Fragment } from "react";

type ContactPageProps = {
  params?: { locale?: Locale } | Promise<{ locale?: Locale }>;
};

export default async function ContactPage({ params }: ContactPageProps = {}) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale ?? (await getLocale());
  const content = await fetchContactResolvedContent(locale);
  const homeContent = await fetchHomeResolvedContent(locale);
  const orderedSections = Object.entries(content.sections)
    .sort(([, a], [, b]) => Number(a.order || 0) - Number(b.order || 0))
    .map(([key]) => key as keyof typeof content.sections);

  const sectionNode = (sectionKey: keyof typeof content.sections) => {
    if (!content.sections[sectionKey].enabled) return null;
    if (sectionKey === "details") {
      return <ContactContent locale={locale} content={{ details: content.details, form: content.form }} />;
    }
    if (sectionKey === "inquiry") {
      return <BookingInquiryForm locale={locale} />;
    }
    if (sectionKey === "bookingPartners") {
      return (
        <BookingPartnersSection
          partners={homeContent.hero.bookingPartners}
          title={homeContent.hero.bookingPartnersTitle}
          description={homeContent.hero.bookingPartnersDescription}
        />
      );
    }
    return null;
  };

  return (
    <>
      <Header locale={locale} />
      <main>
        <a href="#" id="back-to-top"></a>
        <ContactHero locale={locale} content={content.hero} />
        {orderedSections.map((sectionKey) => (
          <Fragment key={sectionKey}>{sectionNode(sectionKey)}</Fragment>
        ))}
      </main>
      <Footer locale={locale} />
      <BuyNow />
    </>
  );
}
