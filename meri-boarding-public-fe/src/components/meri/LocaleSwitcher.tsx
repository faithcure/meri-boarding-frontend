"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Locale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";

type LocaleSwitcherProps = {
  variant?: "header" | "footer" | "menu";
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
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentLocale =
    locales.find((item) => pathname.split("/")[1] === item.code)?.code ?? defaultLocale;
  const currentLocaleItem = locales.find((item) => item.code === currentLocale) ?? locales[0];

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (dropdownRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const handleSelectLocale = (nextLocale: Locale) => {
    setLocaleCookie(nextLocale);
    setIsOpen(false);
    if (nextLocale === currentLocale) return;
    router.push(localePath(nextLocale, pathname));
  };

  if (variant === "menu") {
    return (
      <li className="mobile-menu-locale">
        <div className="mobile-menu-locale-title">Language</div>
        <div className="mobile-menu-locale-links">
          {locales.map((locale) => (
            <a
              key={locale.code}
              href={localePath(locale.code as Locale, pathname)}
              className={`menu-item mobile-menu-locale-link ${currentLocale === locale.code ? "is-active" : ""}`}
              aria-current={currentLocale === locale.code ? "page" : undefined}
              aria-label={locale.label}
              onClick={() => setLocaleCookie(locale.code)}
            >
              <img className="lang-flag" src={locale.flag} alt="" aria-hidden="true" />
              <span>{locale.label}</span>
            </a>
          ))}
        </div>
      </li>
    );
  }

  if (variant === "header") {
    return (
      <div className="lang-switcher lang-switcher--header lang-dropdown" ref={dropdownRef}>
        <button
          type="button"
          className="lang-dropdown-toggle"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label="Language"
          onClick={() => {
            setIsOpen((prev) => !prev);
          }}
        >
          <img
            className="lang-flag lang-dropdown-flag"
            src={currentLocaleItem.flag}
            alt=""
            aria-hidden="true"
          />
          <span className="lang-dropdown-label">{currentLocaleItem.label}</span>
          <i
            className={`fa fa-angle-down lang-dropdown-caret ${isOpen ? "is-open" : ""}`}
            aria-hidden="true"
          ></i>
        </button>
        <div
          className={`lang-dropdown-menu ${isOpen ? "is-open" : ""}`}
          role="listbox"
          aria-label="Language options"
          aria-hidden={!isOpen}
        >
          {locales.map((locale) => (
            <button
              key={locale.code}
              type="button"
              role="option"
              aria-selected={currentLocale === locale.code}
              className={`lang-dropdown-item ${currentLocale === locale.code ? "is-active" : ""}`}
              onClick={() => handleSelectLocale(locale.code as Locale)}
            >
              <img className="lang-flag lang-dropdown-flag" src={locale.flag} alt="" aria-hidden="true" />
              <span>{locale.label}</span>
            </button>
          ))}
        </div>
        <div className="lang-mobile-flags" role="group" aria-label="Language">
          {locales.map((locale) => (
            <button
              key={locale.code}
              type="button"
              className={`lang-mobile-flag-btn ${currentLocale === locale.code ? "is-active" : ""}`}
              aria-pressed={currentLocale === locale.code}
              aria-label={locale.label}
              onClick={() => handleSelectLocale(locale.code as Locale)}
            >
              <img className="lang-flag" src={locale.flag} alt="" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="lang-switcher lang-switcher--footer"
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
