import AmenitiesHero from "@/components/meri/AmenitiesHero";
import AmenitiesContent from "@/components/meri/AmenitiesContent";
import BuyNow from "@/components/meri/BuyNow";
import Footer from "@/components/meri/Footer";
import Header from "@/components/meri/Header";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { fetchAmenitiesResolvedContent } from "@/lib/amenitiesContentApi";

type AmenitiesPageProps = {
  params?: { locale?: Locale } | Promise<{ locale?: Locale }>;
};

export default async function AmenitiesPage({ params }: AmenitiesPageProps = {}) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale ?? (await getLocale());
  const content = await fetchAmenitiesResolvedContent(locale);
  return (
    <>
      <Header locale={locale} />
      <main>
        <a href="#" id="back-to-top"></a>
        <AmenitiesHero locale={locale} content={content.hero} />
        <AmenitiesContent locale={locale} content={content} />
      </main>
      <Footer locale={locale} />
      <BuyNow />
    </>
  );
}
