import type { MetadataRoute } from "next";
import type { Locale } from "@/i18n/getLocale";
import { fetchPublicHotels } from "@/lib/hotelsApi";
import { getSiteUrl } from "@/lib/siteUrl";

const locales: Locale[] = ["de", "en", "tr"];
const staticPaths = ["", "/services", "/amenities", "/hotels", "/contact", "/reservation", "/impressum", "/privacy", "/agb"] as const;
const fallbackHotelSlugs = ["europaplatz", "flamingo", "hildesheim"];

export const revalidate = 3600;

function buildLocalizedUrl(siteUrl: string, locale: Locale, path: string) {
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `${siteUrl}/${locale}${normalizedPath}`;
}

function buildLanguageAlternates(siteUrl: string, path: string) {
  return Object.fromEntries(locales.map((locale) => [locale, buildLocalizedUrl(siteUrl, locale, path)])) as Record<Locale, string>;
}

async function getHotelSlugs() {
  const slugSet = new Set<string>(fallbackHotelSlugs);

  await Promise.all(
    locales.map(async (locale) => {
      const hotels = await fetchPublicHotels(locale);
      for (const hotel of hotels) {
        const slug = String(hotel.slug || "").trim();
        if (slug) slugSet.add(slug);
      }
    }),
  );

  return [...slugSet];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const path of staticPaths) {
    const alternates = buildLanguageAlternates(siteUrl, path);
    const priority = path === "" ? 1 : 0.8;
    const changeFrequency = path === "" ? "daily" : "weekly";

    for (const locale of locales) {
      entries.push({
        url: alternates[locale],
        lastModified: now,
        changeFrequency,
        priority,
        alternates: {
          languages: alternates,
        },
      });
    }
  }

  const hotelSlugs = await getHotelSlugs();
  for (const slug of hotelSlugs) {
    const path = `/hotels/${encodeURIComponent(slug)}`;
    const alternates = buildLanguageAlternates(siteUrl, path);

    for (const locale of locales) {
      entries.push({
        url: alternates[locale],
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
        alternates: {
          languages: alternates,
        },
      });
    }
  }

  return entries;
}
