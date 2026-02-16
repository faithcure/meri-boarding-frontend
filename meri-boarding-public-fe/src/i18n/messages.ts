import type { Locale } from "@/i18n/getLocale";
import de from "@/i18n/locales/de.json";
import en from "@/i18n/locales/en.json";
import tr from "@/i18n/locales/tr.json";

export type Messages = typeof de;

export const messages: Record<Locale, Messages> = {
  de,
  en,
  tr,
};

export function getMessages(locale: Locale) {
  return messages[locale] ?? messages.de;
}
