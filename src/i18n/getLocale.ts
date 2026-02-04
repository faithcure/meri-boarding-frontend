import { headers, cookies } from "next/headers";

export type Locale = "de" | "en" | "tr";

const supportedLocales: Locale[] = ["de", "en", "tr"];
const defaultLocale: Locale = "de";

export async function getLocale() {
  const headersList = await headers();
  const headerLocale = headersList.get?.("x-locale") as Locale | null;
  if (headerLocale && supportedLocales.includes(headerLocale)) {
    return headerLocale;
  }
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get?.("LOCALE")?.value as Locale | undefined;
  if (cookieLocale && supportedLocales.includes(cookieLocale)) {
    return cookieLocale;
  }
  return defaultLocale;
}
