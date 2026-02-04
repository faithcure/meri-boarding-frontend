import type { Locale } from "@/i18n/getLocale";
import HomePage from "../home-page";

type LocalePageProps = {
  params: { locale: Locale } | Promise<{ locale: Locale }>;
};

export default async function Page({ params }: LocalePageProps) {
  const resolvedParams = await params;
  return <HomePage locale={resolvedParams.locale} />;
}
