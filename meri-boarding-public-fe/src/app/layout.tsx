import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ChatWidget from "@/components/meri/ChatWidget";
import HeaderScrollState from "@/components/meri/HeaderScrollState";
import LegacyScripts from "@/components/meri/LegacyScripts";
import RouteEffects from "@/components/meri/RouteEffects";
import RouteTransitionOverlay from "@/components/meri/RouteTransitionOverlay";
import SiteAnalyticsTracker from "@/components/meri/SiteAnalyticsTracker";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { fetchSiteIconUrl } from "@/lib/siteSettingsApi";
import { getSiteUrl } from "@/lib/siteUrl";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteTitle = "Meri Boarding Group";
const siteDescription = "Serviced apartments and boarding houses.";

function toAbsoluteUrl(url: string, siteUrl: string) {
  if (!url) return siteUrl;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${siteUrl}${url}`;
  return `${siteUrl}/${url.replace(/^\/+/, "")}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const siteIconUrl = await fetchSiteIconUrl();
  const absoluteSiteIconUrl = toAbsoluteUrl(siteIconUrl, siteUrl);
  const absoluteShareImageUrl = toAbsoluteUrl("/api/og/site-icon.png", siteUrl);

  return {
    metadataBase: new URL(siteUrl),
    title: siteTitle,
    description: siteDescription,
    applicationName: siteTitle,
    alternates: {
      canonical: siteUrl,
    },
    icons: {
      icon: [{ url: absoluteSiteIconUrl }],
      shortcut: [{ url: absoluteSiteIconUrl }],
      apple: [{ url: absoluteSiteIconUrl }],
    },
    openGraph: {
      type: "website",
      url: siteUrl,
      siteName: siteTitle,
      title: siteTitle,
      description: siteDescription,
      images: [
        {
          url: absoluteShareImageUrl,
          type: "image/png",
          width: 1200,
          height: 630,
          alt: "Meri Boarding Group site icon",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
      images: [absoluteShareImageUrl],
    },
  };
}

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
        <link rel="stylesheet" href="/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/css/plugins.css" />
        <link rel="stylesheet" href="/fonts/fontawesome6/css/fontawesome.css" />
        <link rel="stylesheet" href="/fonts/fontawesome6/css/brands.css" />
        <link rel="stylesheet" href="/fonts/fontawesome6/css/solid.css" />
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
        <SiteAnalyticsTracker locale={locale as "de" | "en" | "tr"} />
        <RouteTransitionOverlay />
        <HeaderScrollState />
        <ChatWidget locale={locale as "de" | "en" | "tr"} />
        <RouteEffects />
        <LegacyScripts />
      </body>
    </html>
  );
}
