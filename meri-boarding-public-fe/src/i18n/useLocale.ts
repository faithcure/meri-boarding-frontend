"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "./getLocale";

const locales: Locale[] = ["de", "en", "tr"];
const defaultLocale: Locale = "de";

export function useLocale(): Locale {
  const pathname = usePathname() || "/";
  const segment = pathname.split("/")[1] as Locale | undefined;
  return segment && locales.includes(segment) ? segment : defaultLocale;
}
