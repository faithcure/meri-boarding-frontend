import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ChatWidget from "@/components/meri/ChatWidget";
import HeaderScrollState from "@/components/meri/HeaderScrollState";
import LegacyScripts from "@/components/meri/LegacyScripts";
import RouteEffects from "@/components/meri/RouteEffects";
import RouteTransitionOverlay from "@/components/meri/RouteTransitionOverlay";
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

const deferredStylesheets = ["/css/daterangepicker.css"] as const;

const deferredStylesScript = `(() => {
  const styles = ${JSON.stringify(deferredStylesheets)};
  const loadStyles = () => {
    for (const href of styles) {
      if (document.querySelector('link[data-deferred-css="' + href + '"]')) continue;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute('data-deferred-css', href);
      document.head.appendChild(link);
    }
  };
  if (document.readyState === 'complete') {
    loadStyles();
  } else {
    window.addEventListener('load', loadStyles, { once: true });
  }
})();`;

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
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/coloring.css" />
        <link rel="stylesheet" href="/css/colors/scheme-01.css" />
        <script dangerouslySetInnerHTML={{ __html: deferredStylesScript }} />
        <noscript>
          {deferredStylesheets.map((href) => (
            <link key={href} rel="stylesheet" href={href} />
          ))}
        </noscript>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <RouteTransitionOverlay />
        <HeaderScrollState />
        <ChatWidget locale={locale as "de" | "en" | "tr"} />
        <RouteEffects />
        <LegacyScripts />
      </body>
    </html>
  );
}
