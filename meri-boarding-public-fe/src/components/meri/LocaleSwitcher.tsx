"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";

type LocaleSwitcherProps = {
  variant?: "header" | "footer";
};

const locales = [
  { code: "de", label: "Deutsch", flag: "/images/flags/de.svg" },
  { code: "en", label: "English", flag: "/images/flags/gb.svg" },
  { code: "tr", label: "Türkçe", flag: "/images/flags/tr.svg" },
];

const defaultLocale = "de";

const cookieMaxAge = 60 * 60 * 24 * 365;

function setLocaleCookie(locale: string) {
  if (typeof document === "undefined") return;
  document.cookie = `LOCALE=${locale}; path=/; max-age=${cookieMaxAge}`;
}

export default function LocaleSwitcher({ variant = "header" }: LocaleSwitcherProps) {
  const pathname = usePathname() || "/";
  const currentLocale =
    locales.find((item) => pathname.split("/")[1] === item.code)?.code ?? defaultLocale;

  return (
    <div
      className={`lang-switcher ${variant === "header" ? "lang-switcher--header" : "lang-switcher--footer"}`}
      role="group"
      aria-label="Language"
    >
      {locales.map((locale) => (
        <a
          key={locale.code}
          href={localePath(locale.code as Locale, pathname)}
          className={`lang-pill ${currentLocale === locale.code ? "is-active" : ""}`}
          aria-pressed={currentLocale === locale.code}
          aria-label={locale.label}
          data-tooltip={locale.label}
          onClick={() => setLocaleCookie(locale.code)}
        >
          <img className="lang-flag" src={locale.flag} alt="" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
