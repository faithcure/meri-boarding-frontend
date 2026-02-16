import AmenitiesHero from "@/components/meri/AmenitiesHero";
import AmenitiesContent from "@/components/meri/AmenitiesContent";
import BuyNow from "@/components/meri/BuyNow";
import Footer from "@/components/meri/Footer";
import Header from "@/components/meri/Header";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";

type AmenitiesPageProps = {
  params?: { locale?: Locale } | Promise<{ locale?: Locale }>;
};

export default async function AmenitiesPage({ params }: AmenitiesPageProps = {}) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale ?? (await getLocale());
  return (
    <>
      <Header locale={locale} />
      <main>
        <a href="#" id="back-to-top"></a>
        <AmenitiesHero locale={locale} />
        <AmenitiesContent />
      </main>
      <Footer locale={locale} />
      <BuyNow />
    </>
  );
}
