import type { Locale } from "@/i18n/getLocale";

const locales: Locale[] = ["de", "en", "tr"];

export function localePath(locale: Locale, path: string) {
  if (!path) return `/${locale}`;
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("mailto:") ||
    path.startsWith("tel:") ||
    path.startsWith("#")
  ) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return `/${locale}`;

  const segments = normalized.split("/");
  const maybeLocale = segments[1] as Locale | undefined;
  if (maybeLocale && locales.includes(maybeLocale)) {
    segments[1] = locale;
    return segments.join("/") || `/${locale}`;
  }

  return `/${locale}${normalized}`;
}
