import BuyNow from "@/components/meri/BuyNow";
import Facilities from "@/components/meri/Facilities";
import Faq from "@/components/meri/Faq";
import Footer from "@/components/meri/Footer";
import Gallery from "@/components/meri/Gallery";
import Header from "@/components/meri/Header";
import Hero from "@/components/meri/Hero";
import Offers from "@/components/meri/Offers";
import Rooms from "@/components/meri/Rooms";
import Testimonials from "@/components/meri/Testimonials";
import VideoCta from "@/components/meri/VideoCta";
import type { Locale } from "@/i18n/getLocale";
import { fetchHomeResolvedContent } from "@/lib/homeContentApi";
import { Fragment } from "react";

type HomePageProps = {
  locale: Locale;
};

export default async function HomePage({ locale }: HomePageProps) {
  const content = await fetchHomeResolvedContent(locale);
  const orderedSections = Object.entries(content.sections)
    .sort(([, a], [, b]) => Number(a.order || 0) - Number(b.order || 0))
    .map(([key]) => key as keyof typeof content.sections);

  const sectionNode = (sectionKey: keyof typeof content.sections) => {
    if (!content.sections[sectionKey].enabled) return null;

    if (sectionKey === "hero") return <Hero locale={locale} content={content.hero} />;
    if (sectionKey === "rooms") return <Rooms locale={locale} content={content.rooms} />;
    if (sectionKey === "testimonials") return <Testimonials content={content.testimonials} />;
    if (sectionKey === "facilities") return <Facilities content={content.facilities} />;
    if (sectionKey === "gallery") return <Gallery content={content.gallery} />;
    if (sectionKey === "offers") return <Offers locale={locale} content={content.offers} />;
    if (sectionKey === "faq") return <Faq locale={locale} content={content.faq} />;
    return null;
  };

  return (
    <>
      <Header locale={locale} />
      <main>
        <a href="#" id="back-to-top"></a>
        {orderedSections.map((sectionKey) => (
          <Fragment key={sectionKey}>{sectionNode(sectionKey)}</Fragment>
        ))}
        <VideoCta />
      </main>
      <Footer locale={locale} />
      <BuyNow />
    </>
  );
}
