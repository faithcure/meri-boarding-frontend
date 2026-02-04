import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import ChatWidget from "@/components/meri/ChatWidget";
import PreloaderController from "@/components/meri/PreloaderController";
import RouteEffects from "@/components/meri/RouteEffects";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meri Boarding Group",
  description: "Serviced apartments and boarding houses.",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params?: { locale?: Locale } | Promise<{ locale?: Locale }>;
}>) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale ?? (await getLocale());

  return (
    <html lang={locale}>
      <head>
        <link rel="icon" href="/images/icon.webp" type="image/gif" sizes="16x16" />
        <link rel="stylesheet" href="/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/css/plugins.css" />
        <link rel="stylesheet" href="/css/swiper.css" />
        <link rel="stylesheet" href="/css/swiper-custom-1.css" />
        <link rel="stylesheet" href="/css/daterangepicker.css" />
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/coloring.css" />
        <link rel="stylesheet" href="/css/colors/scheme-01.css" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div id="de-loader" aria-hidden="true">
          <div className="lds-roller">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>
        {children}
        <ChatWidget locale={locale as "de" | "en" | "tr"} />
        <PreloaderController />
        <RouteEffects />
        <Script src="/js/vendors.js" strategy="afterInteractive" />
        <Script src="/js/meta-works.js" strategy="afterInteractive" />
        <Script src="/js/swiper.js" strategy="afterInteractive" />
        <Script src="/js/custom-swiper-1.js" strategy="afterInteractive" />
        <Script src="/js/moment.js" strategy="afterInteractive" />
        <Script src="/js/daterangepicker.js" strategy="afterInteractive" />
        <Script src="/js/custom-datepicker.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
