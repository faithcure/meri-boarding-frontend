import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import ChatWidget from "@/components/meri/ChatWidget";
import HeaderScrollState from "@/components/meri/HeaderScrollState";
import LegacyScripts from "@/components/meri/LegacyScripts";
import RouteEffects from "@/components/meri/RouteEffects";
import RouteTransitionOverlay from "@/components/meri/RouteTransitionOverlay";
import SiteAnalyticsTracker from "@/components/meri/SiteAnalyticsTracker";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { fetchGeneralSocialLinks, fetchSiteIconUrl } from "@/lib/siteSettingsApi";
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
const localeList: Locale[] = ["de", "en", "tr"];

function normalizePathname(pathname: string) {
  const raw = String(pathname || "").trim();
  if (!raw) return "/";
  const pathOnly = raw.split("?")[0].split("#")[0];
  if (!pathOnly.startsWith("/")) return `/${pathOnly}`;
  return pathOnly;
}

function buildLocalizedPath(pathname: string, locale: Locale) {
  const normalizedPath = normalizePathname(pathname);
  const segments = normalizedPath.split("/");
  const maybeLocale = segments[1] as Locale | undefined;

  if (maybeLocale && localeList.includes(maybeLocale)) {
    segments[1] = locale;
    return segments.join("/") || `/${locale}`;
  }

  return `/${locale}${normalizedPath === "/" ? "" : normalizedPath}`;
}

function toAbsoluteUrl(url: string, siteUrl: string) {
  if (!url) return siteUrl;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${siteUrl}${url}`;
  return `${siteUrl}/${url.replace(/^\/+/, "")}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const headerStore = await headers();
  const requestPathname = normalizePathname(headerStore.get("x-pathname") || "/");
  const siteIconUrl = await fetchSiteIconUrl();
  const absoluteSiteIconUrl = toAbsoluteUrl(siteIconUrl, siteUrl);
  const absoluteShareImageUrl = toAbsoluteUrl("/api/og/site-icon.png", siteUrl);
  const canonicalUrl = toAbsoluteUrl(requestPathname, siteUrl);
  const languageAlternates = Object.fromEntries(
    localeList.map((locale) => [locale, toAbsoluteUrl(buildLocalizedPath(requestPathname, locale), siteUrl)]),
  ) as Record<Locale, string>;

  return {
    metadataBase: new URL(siteUrl),
    title: siteTitle,
    description: siteDescription,
    applicationName: siteTitle,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ...languageAlternates,
        "x-default": languageAlternates.de,
      },
    },
    icons: {
      icon: [{ url: "/favicon.ico" }, { url: absoluteSiteIconUrl }],
      shortcut: [{ url: "/favicon.ico" }],
      apple: [{ url: absoluteSiteIconUrl }],
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
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
  const siteUrl = getSiteUrl();
  const socialLinks = await fetchGeneralSocialLinks().catch(() => []);
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: siteTitle,
    url: siteUrl,
    logo: `${siteUrl}/favicon.ico`,
    image: [`${siteUrl}/api/og/site-icon.png`],
    sameAs: socialLinks.map((item) => item.url).filter(Boolean),
    email: "info@meri-boarding.de",
    telephone: "+49 711 5489840",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Stuttgart",
      addressCountry: "DE",
    },
  };

  return (
    <html lang={locale}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
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
