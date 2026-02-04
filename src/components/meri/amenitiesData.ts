import type { Locale } from "@/i18n/getLocale";
import { getMessages } from "@/i18n/messages";

export type AmenityCard = {
  title: string;
  icon: string;
  image: string;
  description: string;
  highlights: string[];
};

export function getAmenityCards(locale: Locale): AmenityCard[] {
  return getMessages(locale).amenitiesData.cards;
}

export function getAmenityOverviewItems(locale: Locale): string[] {
  return getMessages(locale).amenitiesData.overviewItems;
}
