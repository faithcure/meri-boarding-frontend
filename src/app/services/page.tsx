import BuyNow from "@/components/meri/BuyNow";
import Footer from "@/components/meri/Footer";
import Header from "@/components/meri/Header";
import ServicesContent from "@/components/meri/ServicesContent";
import ServicesHero from "@/components/meri/ServicesHero";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";

type ServicesPageProps = {
  params?: { locale?: Locale } | Promise<{ locale?: Locale }>;
};

export default async function ServicesPage({ params }: ServicesPageProps = {}) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale ?? (await getLocale());
  return (
    <>
      <Header locale={locale} />
      <main>
        <a href="#" id="back-to-top"></a>
        <ServicesHero locale={locale} />
        <ServicesContent locale={locale} />
      </main>
      <Footer locale={locale} />
      <BuyNow />
    </>
  );
}
