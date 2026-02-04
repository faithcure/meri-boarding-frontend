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

type HomePageProps = {
  locale: Locale;
};

export default function HomePage({ locale }: HomePageProps) {
  return (
    <>
      <Header locale={locale} />
      <main>
        <a href="#" id="back-to-top"></a>
        <Hero locale={locale} />
        <Rooms locale={locale} />
        <Testimonials locale={locale} />
        <Facilities locale={locale} />
        <Gallery locale={locale} />
        <Offers locale={locale} />
        <Faq locale={locale} />
        <VideoCta />
      </main>
      <Footer locale={locale} />
      <BuyNow />
    </>
  );
}
