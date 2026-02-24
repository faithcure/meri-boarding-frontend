"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { useLocale } from "@/i18n/useLocale";
import type { Messages } from "@/i18n/messages";
import { getMessages } from "@/i18n/messages";
import { withPublicApiBaseIfNeeded } from "@/lib/apiBaseUrl";

type Message = {
  role: "assistant" | "user";
  text: string;
  html?: string;
  variant?: "default" | "meta" | "error" | "action" | "warn";
};
type FeedbackChoice = "correct" | "incorrect";

type ChatApiResponse = {
  answer?: string;
  model?: string;
  error?: string;
  answerLocale?: "tr" | "de" | "en";
};

type PublicHotel = {
  slug: string;
  name?: string;
  available?: boolean;
};

type ReservationDraft = {
  hotelSlugs: string[];
  checkin: string;
  checkout: string;
  guests: string;
  children: string;
  accessible: boolean;
  phone: string;
};

const fallbackReservationHotels: PublicHotel[] = [
  { slug: "europaplatz", name: "Europaplatz", available: true },
  { slug: "flamingo", name: "Flamingo", available: true },
  { slug: "hildesheim", name: "Hildesheim", available: true },
];

const initialMessages = (t: Messages["chatWidget"]): Message[] => [
  {
    role: "assistant",
    text: t.intro,
  },
];

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function formatAssistantText(value: string) {
  const text = String(value || "");
  const tokenPattern =
    /(https?:\/\/[^\s]+|www\.[^\s]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?){2,}\d{2,4})/gi;

  let output = "";
  let cursor = 0;
  let match = tokenPattern.exec(text);

  while (match) {
    const token = String(match[0] || "").trim();
    const start = match.index;
    const end = start + token.length;

    output += escapeHtml(text.slice(cursor, start)).replace(/\n/g, "<br />");

    const isEmail = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(token);
    const isUrl = /^https?:\/\/|^www\./i.test(token);
    const phoneDigits = token.replace(/[^\d+]/g, "");
    const isPhone = !isEmail && !isUrl && phoneDigits.replace(/\D/g, "").length >= 8;

    if (isEmail) {
      output += `<a class="chat-rich-link email" href="mailto:${escapeHtml(token)}">${escapeHtml(token)}</a>`;
    } else if (isUrl) {
      const href = token.startsWith("http") ? token : `https://${token}`;
      output += `<a class="chat-rich-link url" href="${escapeHtml(href)}" target="_blank" rel="noreferrer noopener">${escapeHtml(token)}</a>`;
    } else if (isPhone) {
      output += `<a class="chat-rich-link phone" href="tel:${escapeHtml(phoneDigits)}">${escapeHtml(token)}</a>`;
    } else {
      output += escapeHtml(token);
    }

    cursor = end;
    match = tokenPattern.exec(text);
  }

  output += escapeHtml(text.slice(cursor)).replace(/\n/g, "<br />");
  return output;
}

type ChatWidgetProps = {
  locale?: Locale;
};

const chatApiUrl = withPublicApiBaseIfNeeded("/api/v1/chat");
const chatEventsApiUrl = withPublicApiBaseIfNeeded("/api/v1/chat/events");
const chatSessionsApiUrl = withPublicApiBaseIfNeeded("/api/v1/chat/sessions");
const hotelsApiBaseUrl = withPublicApiBaseIfNeeded("/api/v1/public/hotels");
const quoteFormApiUrl = withPublicApiBaseIfNeeded("/api/v1/public/forms/request");
const minAssistantDelayMs = 1000;
const maxAssistantDelayMs = 2000;

function getChatErrorText(locale: Locale) {
  if (locale === "tr") return "Mesaj gonderilemedi. Lutfen tekrar deneyin.";
  if (locale === "de") return "Nachricht konnte nicht gesendet werden. Bitte erneut versuchen.";
  return "Message could not be sent. Please try again.";
}

function getUiLabels(locale: Locale) {
  if (locale === "tr") {
    return {
      locale: "TR",
      online: "Online",
      avgResponse: "Ort. yanit",
      quickActions: ["Rezervasyon", "Pet izni", "Erisilebilir oda", "Temsilci"],
      policy: "Politika",
      reservationCardTitle: "Hizli Rezervasyon Akisi",
      checkinAsk: "Lutfen giris tarihini YYYY-MM-DD formatinda yazin.",
      checkoutAsk: "Lutfen cikis tarihini YYYY-MM-DD formatinda yazin.",
      guestsAsk: "Lutfen misafir bilgilerini asagidan secin.",
      phoneAsk: "Son adim olarak telefon numaranizi paylasin.",
      badDate: "Tarih formati gecersiz. Ornekler: 2026-03-15, 15.03.2026, yarin",
      badCheckout: "Cikis tarihi, giris tarihinden once olamaz.",
      badGuests: "Misafir sayisi 1 ile 20 arasinda olmalidir.",
      badPhone: "Lutfen gecerli bir telefon numarasi girin.",
      guestPickerTitle: "Misafir secimi",
      adultGuestsLabel: "Yetiskin misafir",
      childGuestsLabel: "Cocuk misafir",
      accessibleGuestLabel: "Engelli vatandas / erisilebilir ihtiyaci",
      guestPickerContinue: "Misafir bilgileriyle devam et",
      phoneInputLabel: "Telefon numarasi",
      phoneInputPlaceholder: "Ornek: +49 152 064 19253",
      phoneContinue: "Telefonla devam et",
      complete: (link: string) => `Harika, bilgileri tamamladik. Buradan devam edebilirsiniz: ${link}`,
      handoff: "Musteri temsilcisine baglan: +49 152 064 19253 | reservation@meri-group.de",
      priceRedirect: "Fiyat bilgisi icin sizi yetkili ekibe yonlendireyim.",
      lowConfidence: "Bu bilgi sinirli olabilir. Gerekirse temsilciye yonlendirebilirim.",
      hotelPickerTitle: "Otel secimi",
      hotelPickerHelp: "Birden fazla otel secilebilir.",
      hotelPickerContinue: "Secimle devam et",
      hotelPickerUnavailable: "Dolu",
      hotelPickerSelected: (names: string) => `Secilen oteller: ${names}`,
      contactAsk: "Daha iyi hizmet icin lutfen ad soyad ve e-posta adresinizi paylasin.",
      contactPending: "Devam edebilmek icin lutfen asagidaki bilgileri doldurun.",
      contactNameLabel: "Ad Soyad",
      contactEmailLabel: "E-posta",
      contactNamePlaceholder: "Ornek: Ahmet Yilmaz",
      contactEmailPlaceholder: "ornek@email.com",
      contactSubmit: "Bilgileri gonder",
      contactValidation: "Lutfen gecerli bir ad soyad ve e-posta girin.",
      contactThanks: "Tesekkurler, bilgilerinizi aldim.",
      datePickerTitleCheckin: "Giris tarihi secin",
      datePickerTitleCheckout: "Cikis tarihi secin",
      datePickerContinue: "Tarihle devam et",
      pastDate: "Bugunden onceki bir tarih secemezsiniz.",
      greeting: (name: string) =>
        name ? `Merhaba ${name}, size nasil yardimci olabilirim?` : "Merhaba, size nasil yardimci olabilirim?",
    };
  }
  if (locale === "de") {
    return {
      locale: "DE",
      online: "Online",
      avgResponse: "Ø Antwort",
      quickActions: ["Reservierung", "Haustiere", "Barrierefrei", "Kontakt"],
      policy: "Richtlinie",
      reservationCardTitle: "Schneller Reservierungsablauf",
      checkinAsk: "Bitte geben Sie das Check-in Datum im Format YYYY-MM-DD ein.",
      checkoutAsk: "Bitte geben Sie das Check-out Datum im Format YYYY-MM-DD ein.",
      guestsAsk: "Bitte waehlen Sie die Gaestedaten unten aus.",
      phoneAsk: "Als letzten Schritt teilen Sie bitte Ihre Telefonnummer mit.",
      badDate: "Ungueltiges Datumsformat. Beispiele: 2026-03-15, 15.03.2026, morgen",
      badCheckout: "Check-out darf nicht vor Check-in liegen.",
      badGuests: "Die Gaestezahl muss zwischen 1 und 20 liegen.",
      badPhone: "Bitte geben Sie eine gueltige Telefonnummer ein.",
      guestPickerTitle: "Gaesteauswahl",
      adultGuestsLabel: "Erwachsene",
      childGuestsLabel: "Kindergaeste",
      accessibleGuestLabel: "Barrierefrei / Gast mit Behinderung",
      guestPickerContinue: "Mit Gaestedaten fortfahren",
      phoneInputLabel: "Telefonnummer",
      phoneInputPlaceholder: "Beispiel: +49 152 064 19253",
      phoneContinue: "Mit Telefon fortfahren",
      complete: (link: string) => `Perfekt, wir haben alles. Hier koennen Sie fortfahren: ${link}`,
      handoff: "Direkter Kontakt: +49 152 064 19253 | reservation@meri-group.de",
      priceRedirect: "Fuer Preisangaben leite ich Sie direkt an unser Team weiter.",
      lowConfidence: "Diese Information kann begrenzt sein. Ich kann Sie an unser Team weiterleiten.",
      hotelPickerTitle: "Hotelauswahl",
      hotelPickerHelp: "Mehrfachauswahl ist moeglich.",
      hotelPickerContinue: "Mit Auswahl fortfahren",
      hotelPickerUnavailable: "Ausgebucht",
      hotelPickerSelected: (names: string) => `Ausgewaehlte Hotels: ${names}`,
      contactAsk: "Fuer besseren Service teilen Sie bitte Ihren Vor- und Nachnamen sowie Ihre E-Mail-Adresse mit.",
      contactPending: "Bitte fuellen Sie die folgenden Angaben aus, um fortzufahren.",
      contactNameLabel: "Vor- und Nachname",
      contactEmailLabel: "E-Mail",
      contactNamePlaceholder: "Beispiel: Max Mustermann",
      contactEmailPlaceholder: "beispiel@email.com",
      contactSubmit: "Daten senden",
      contactValidation: "Bitte geben Sie einen gueltigen Namen und eine gueltige E-Mail ein.",
      contactThanks: "Danke, ich habe Ihre Angaben erhalten.",
      datePickerTitleCheckin: "Check-in Datum waehlen",
      datePickerTitleCheckout: "Check-out Datum waehlen",
      datePickerContinue: "Mit Datum fortfahren",
      pastDate: "Sie koennen kein Datum vor heute auswaehlen.",
      greeting: (name: string) =>
        name ? `Hallo ${name}, wie kann ich Ihnen helfen?` : "Hallo, wie kann ich Ihnen helfen?",
    };
  }
  return {
    locale: "EN",
    online: "Online",
    avgResponse: "Avg response",
    quickActions: ["Reservation", "Pet policy", "Accessible room", "Agent"],
    policy: "Policy",
    reservationCardTitle: "Quick Reservation Flow",
    checkinAsk: "Please enter check-in date in YYYY-MM-DD format.",
    checkoutAsk: "Please enter check-out date in YYYY-MM-DD format.",
    guestsAsk: "Please select guest details below.",
    phoneAsk: "As a final step, please share your phone number.",
    badDate: "Invalid date format. Examples: 2026-03-15, 15/03/2026, tomorrow",
    badCheckout: "Check-out cannot be before check-in.",
    badGuests: "Guest count must be between 1 and 20.",
    badPhone: "Please enter a valid phone number.",
    guestPickerTitle: "Guest selection",
    adultGuestsLabel: "Adult guests",
    childGuestsLabel: "Child guests",
    accessibleGuestLabel: "Disabled guest / accessibility need",
    guestPickerContinue: "Continue with guest details",
    phoneInputLabel: "Phone number",
    phoneInputPlaceholder: "Example: +49 152 064 19253",
    phoneContinue: "Continue with phone",
    complete: (link: string) => `Great, we captured the details. Continue here: ${link}`,
    handoff: "Contact reservation team: +49 152 064 19253 | reservation@meri-group.de",
    priceRedirect: "For pricing details, I will connect you with our authorized team.",
    lowConfidence: "This answer may be limited. I can connect you to our team if needed.",
    hotelPickerTitle: "Hotel selection",
    hotelPickerHelp: "You can select multiple hotels.",
    hotelPickerContinue: "Continue with selection",
    hotelPickerUnavailable: "Full",
    hotelPickerSelected: (names: string) => `Selected hotels: ${names}`,
    contactAsk: "For better service, please share your full name and email address.",
    contactPending: "Please complete the details below to continue.",
    contactNameLabel: "Full name",
    contactEmailLabel: "Email",
    contactNamePlaceholder: "Example: John Doe",
    contactEmailPlaceholder: "example@email.com",
    contactSubmit: "Submit details",
    contactValidation: "Please enter a valid full name and email.",
    contactThanks: "Thanks, I received your details.",
    datePickerTitleCheckin: "Select check-in date",
    datePickerTitleCheckout: "Select check-out date",
    datePickerContinue: "Continue with date",
    pastDate: "You cannot select a date earlier than today.",
    greeting: (name: string) =>
      name ? `Hello ${name}, how can I help you today?` : "Hello, how can I help you today?",
  };
}

function normalizeForMatch(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isReservationIntent(text: string) {
  const q = normalizeForMatch(text);
  if (!q) return false;
  return /(rezervasyon|reservation|book|booking|buchen|reservieren|reservierung)/.test(q);
}

function isPriceIntent(text: string) {
  const q = normalizeForMatch(text);
  if (!q) return false;
  return /(price|pricing|cost|costs|rate|rates|quote|fiyat|ucret|ücret|preis|kosten|tarif)/.test(q);
}

function isAgentIntent(text: string) {
  const q = normalizeForMatch(text);
  if (!q) return false;
  return (
    /(agent|human|representative|reservation team|connect me|contact team|yetkili|temsilci|rezervasyon ekibi|musteri temsilcisi|mitarbeiter|ansprechpartner|kontakt|verbinden)/.test(
      q,
    )
  );
}

function isGeneralInfoIntent(text: string) {
  const q = normalizeForMatch(text);
  if (!q) return false;
  return (
    /\?$/.test(String(text || "").trim()) ||
    /(check in|check out|checkin|checkout|price|fiyat|preis|pet|pets|haustier|wifi|location|standort|how many|what|when|wann|wie|was|kac|kaç|nedir)/.test(
      q,
    )
  );
}

function isValidFullName(value: string) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts.length >= 2 && parts.every((part) => part.length >= 2);
}

function isGreetingIntent(text: string) {
  const q = normalizeForMatch(text);
  if (!q) return false;
  return /(merhaba|selam|selamlar|hello|hi|hey|guten tag|hallo|moin)/.test(q);
}

function detectHotelSlugs(input: string, hotels: PublicHotel[]) {
  const q = normalizeForMatch(input);
  if (!q) return [];

  const found = new Map<string, string>();
  const addFoundSlug = (slug: string) => {
    const key = normalizeForMatch(slug);
    if (!key) return;
    if (!found.has(key)) found.set(key, slug);
  };

  const sourceHotels = hotels.length ? hotels : fallbackReservationHotels;
  const findCanonicalHotelSlug = (canonicalSlug: string) => {
    const canonical = normalizeForMatch(canonicalSlug);
    const hit = sourceHotels.find((hotel) => normalizeForMatch(hotel.slug || "") === canonical);
    return String(hit?.slug || canonicalSlug);
  };

  const aliasMap: Array<{ slug: string; aliases: string[] }> = [
    { slug: "europaplatz", aliases: ["europaplatz", "europa platz", "europa"] },
    { slug: "flamingo", aliases: ["flamingo"] },
    { slug: "hildesheim", aliases: ["hildesheim"] },
  ];

  for (const item of aliasMap) {
    if (item.aliases.some((a) => q.includes(a))) addFoundSlug(findCanonicalHotelSlug(item.slug));
  }

  for (const hotel of sourceHotels) {
    const rawSlug = String(hotel.slug || "").trim();
    const slug = normalizeForMatch(rawSlug);
    const name = normalizeForMatch(hotel.name || "");
    if (slug && q.includes(slug)) addFoundSlug(rawSlug);
    if (name && q.includes(name)) addFoundSlug(rawSlug);
  }

  return Array.from(found.values());
}

function getReservationFlowText(locale: Locale) {
  if (locale === "tr") {
    return {
      askHotel:
        "Memnuniyetle yardimci olayim. Asagidaki kutucuklardan bir veya birden fazla otel secin.",
      unknownHotel:
        "En az bir otel secmeniz gerekiyor. Asagidaki kutucuklardan secim yapabilirsiniz.",
      available: (hotelName: string, link: string) =>
        `${hotelName} icin su an uygunluk gorunuyor. Rezervasyon formuna buradan gecebilirsiniz: ${link}`,
      unavailable:
        "Su an bu otelde bos yer gorunmuyor. Dilerseniz rezervasyon ekibimizle iletisime gecebilirsiniz: +49 152 064 19253 veya reservation@meri-group.de.",
    };
  }
  if (locale === "de") {
    return {
      askHotel:
        "Gern helfe ich Ihnen weiter. Bitte waehlen Sie unten ein oder mehrere Hotels per Checkbox aus.",
      unknownHotel:
        "Bitte waehlen Sie mindestens ein Hotel in der Liste unten aus.",
      available: (hotelName: string, link: string) =>
        `Fuer ${hotelName} ist aktuell Verfuegbarkeit sichtbar. Sie koennen hier direkt zur Reservierungsseite gehen: ${link}`,
      unavailable:
        "Aktuell sehen wir dort keine freie Verfuegbarkeit. Gern hilft unser Reservierungsteam weiter: +49 152 064 19253 oder reservation@meri-group.de.",
    };
  }
  return {
    askHotel:
      "Happy to help with that. Please select one or more hotels using the checkboxes below.",
    unknownHotel:
      "Please select at least one hotel from the list below.",
    available: (hotelName: string, link: string) =>
      `${hotelName} currently appears available. You can continue via the reservation page here: ${link}`,
    unavailable:
      "This hotel currently appears full. If you prefer, please contact our reservation team: +49 152 064 19253 or reservation@meri-group.de.",
  };
}

function toIsoDate(year: number, month: number, day: number) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return "";
  if (year < 1900 || year > 2100) return "";
  if (month < 1 || month > 12) return "";
  if (day < 1 || day > 31) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseFlexibleDate(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  const lower = raw
    .toLowerCase()
    .replace(/[?!.,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const toIsoFromDate = (d: Date) =>
    `${String(d.getUTCFullYear()).padStart(4, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
      d.getUTCDate(),
    ).padStart(2, "0")}`;

  if (["today", "bugun", "bugün", "heute"].includes(lower)) return toIsoFromDate(today);
  if (["tomorrow", "yarin", "yarın", "morgen"].includes(lower)) return toIsoFromDate(tomorrow);

  const compact = lower.replace(/\s+/g, "");
  const ymd = compact.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymd) return toIsoDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));

  const dmy = compact.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmy) {
    const yRaw = Number(dmy[3]);
    return toIsoDate(yRaw < 100 ? 2000 + yRaw : yRaw, Number(dmy[2]), Number(dmy[1]));
  }

  const digits = compact.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (digits) return toIsoDate(Number(digits[3]), Number(digits[2]), Number(digits[1]));

  const monthMap: Record<string, number> = {
    january: 1, jan: 1, february: 2, feb: 2, februar: 2, march: 3, mar: 3, mart: 3,
    april: 4, apr: 4, may: 5, mai: 5, mayis: 5, mayıs: 5, june: 6, jun: 6, juni: 6,
    july: 7, jul: 7, juli: 7, temmuz: 7, august: 8, aug: 8, agustos: 8, ağustos: 8,
    september: 9, sep: 9, sept: 9, eylul: 9, eylül: 9, october: 10, oct: 10, oktober: 10, ekim: 10,
    november: 11, nov: 11, kasim: 11, kasım: 11, december: 12, dec: 12, dezember: 12, aralik: 12, aralık: 12,
  };

  const dMonthY = lower.match(/^(\d{1,2})\s+([a-zçğıöşüäöß]+)\s+(\d{2,4})$/i);
  if (dMonthY) {
    const month = monthMap[dMonthY[2].toLowerCase()] || 0;
    const yRaw = Number(dMonthY[3]);
    return toIsoDate(yRaw < 100 ? 2000 + yRaw : yRaw, month, Number(dMonthY[1]));
  }

  const monthDY = lower.match(/^([a-zçğıöşüäöß]+)\s+(\d{1,2}),?\s+(\d{2,4})$/i);
  if (monthDY) {
    const month = monthMap[monthDY[1].toLowerCase()] || 0;
    const yRaw = Number(monthDY[3]);
    return toIsoDate(yRaw < 100 ? 2000 + yRaw : yRaw, month, Number(monthDY[2]));
  }

  return "";
}

function parseDateRange(input: string): { checkin: string; checkout: string } | null {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const candidates: string[] = [];
  const regexes = [/\b\d{4}[\/.-]\d{1,2}[\/.-]\d{1,2}\b/g, /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g];
  for (const re of regexes) {
    for (const match of raw.matchAll(re)) {
      const token = String(match[0] || "").trim();
      if (!token) continue;
      const parsed = parseFlexibleDate(token);
      if (parsed && !candidates.includes(parsed)) candidates.push(parsed);
    }
  }

  if (candidates.length < 2) return null;
  return { checkin: candidates[0], checkout: candidates[1] };
}

function parseGuestCount(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return NaN;
  if (/^\d{1,2}$/.test(raw)) return Number(raw);

  const numericParts = Array.from(raw.matchAll(/\b\d{1,2}\b/g))
    .map((item) => Number(item[0]))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (numericParts.length) return numericParts.reduce((sum, value) => sum + value, 0);

  const wordMap: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    ein: 1, eins: 1, zwei: 2, drei: 3, vier: 4, funf: 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
    bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10,
  };
  const tokens = normalizeForMatch(raw).split(" ").filter(Boolean);
  const total = tokens.reduce((sum, token) => sum + (wordMap[token] || 0), 0);
  return total > 0 ? total : NaN;
}

function normalizePhoneInput(input: string) {
  return String(input || "").replace(/\s+/g, " ").trim();
}

function isValidPhoneNumber(input: string) {
  const value = normalizePhoneInput(input);
  if (!value) return false;
  if (!/^[+\d\s()\-/.]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

function splitFullName(value: string) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayIsoDate() {
  return toLocalIsoDate(new Date());
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const getAssistantDelayMs = () =>
  minAssistantDelayMs + Math.floor(Math.random() * (maxAssistantDelayMs - minAssistantDelayMs + 1));

export default function ChatWidget({ locale: localeProp }: ChatWidgetProps) {
  const activeLocale = useLocale();
  const locale = activeLocale ?? localeProp ?? "de";
  const t = getMessages(locale).chatWidget;
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => initialMessages(t));
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [reservationStep, setReservationStep] = useState<"idle" | "hotel" | "checkin" | "checkout" | "guests" | "phone">("idle");
  const [avgResponseMs, setAvgResponseMs] = useState<number>(0);
  const [chatSessionId, setChatSessionId] = useState("");
  const [hotels, setHotels] = useState<PublicHotel[]>([]);
  const [showDataNotice, setShowDataNotice] = useState(true);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
  const [feedbackChoice, setFeedbackChoice] = useState<FeedbackChoice | null>(null);
  const [feedbackAskedOnce, setFeedbackAskedOnce] = useState(false);
  const [contactRequested, setContactRequested] = useState(false);
  const [contactCompleted, setContactCompleted] = useState(false);
  const [contactFullName, setContactFullName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactError, setContactError] = useState("");
  const [pendingFirstMessage, setPendingFirstMessage] = useState("");
  const [checkinPickerValue, setCheckinPickerValue] = useState("");
  const [checkoutPickerValue, setCheckoutPickerValue] = useState("");
  const [datePickerError, setDatePickerError] = useState("");
  const [adultGuestsValue, setAdultGuestsValue] = useState("1");
  const [childGuestsValue, setChildGuestsValue] = useState("0");
  const [accessibleGuestValue, setAccessibleGuestValue] = useState(false);
  const [guestPickerError, setGuestPickerError] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [reservationDraft, setReservationDraft] = useState<ReservationDraft>({
    hotelSlugs: [],
    checkin: "",
    checkout: "",
    guests: "",
    children: "0",
    accessible: false,
    phone: "",
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const loggedMessageCountRef = useRef(0);
  const feedbackTimerRef = useRef<number | null>(null);
  const labels = getUiLabels(locale);
  const privacyHref = localePath(locale, "/privacy");
  const reservationPath = localePath(locale, "/reservation");
  const reservationHotelOptions = useMemo(() => {
    const source = hotels.length ? hotels : fallbackReservationHotels;
    return source
      .filter((item) => String(item?.slug || "").trim())
      .map((item) => {
        const slug = String(item.slug || "").trim();
        return {
          slug,
          name: String(item.name || slug),
          available: item.available !== false,
        };
      });
  }, [hotels]);
  const needsContactInfo = contactRequested && !contactCompleted;
  const preferredName = useMemo(() => {
    if (!contactCompleted) return "";
    return contactFullName.trim().split(/\s+/).filter(Boolean)[0] || "";
  }, [contactFullName, contactCompleted]);
  const personalizeAssistantText = (text: string, variant?: Message["variant"]) => {
    const safeText = String(text || "");
    if (!preferredName) return safeText;
    if (variant !== "default") return safeText;
    const normalizedName = normalizeForMatch(preferredName);
    const normalizedText = normalizeForMatch(safeText);
    if (normalizedName && normalizedText.includes(normalizedName)) return safeText;
    return `${preferredName}, ${safeText}`;
  };
  const trackEvent = (event: string, extras?: { intent?: string; model?: string; latencyMs?: number }) => {
    fetch(chatEventsApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        sessionId: chatSessionId || undefined,
        locale,
        intent: extras?.intent || "",
        model: extras?.model || "",
        latencyMs: Number(extras?.latencyMs || 0),
      }),
    }).catch(() => undefined);
  };

  const logSessionMessage = (role: "user" | "assistant", text: string, kind = "message") => {
    if (!chatSessionId) return;
    fetch(`${chatSessionsApiUrl}/${chatSessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        text: String(text || ""),
        locale,
        kind,
        intent: reservationStep !== "idle" ? "reservation_flow" : "chat",
      }),
    }).catch(() => undefined);
  };

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isOpen, isTyping]);

  useEffect(() => {
    const localeMessages = getMessages(locale).chatWidget;
    setMessages(initialMessages(localeMessages));
    setInput("");
    setIsTyping(false);
    setReservationStep("idle");
    setShowDataNotice(true);
    setShowFeedbackPrompt(false);
    setFeedbackChoice(null);
    setFeedbackAskedOnce(false);
    setContactRequested(false);
    setContactCompleted(false);
    setContactFullName("");
    setContactEmail("");
    setContactError("");
    setPendingFirstMessage("");
    setCheckinPickerValue("");
    setCheckoutPickerValue("");
    setDatePickerError("");
    setAdultGuestsValue("1");
    setChildGuestsValue("0");
    setAccessibleGuestValue(false);
    setGuestPickerError("");
    setPhoneValue("");
    setPhoneError("");
    setReservationDraft({ hotelSlugs: [], checkin: "", checkout: "", guests: "", children: "0", accessible: false, phone: "" });
    setChatSessionId("");
    loggedMessageCountRef.current = 0;
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, [locale]);

  useEffect(() => {
    if (!chatSessionId) return;
    if (loggedMessageCountRef.current > messages.length) {
      loggedMessageCountRef.current = messages.length;
      return;
    }
    const pending = messages.slice(loggedMessageCountRef.current);
    loggedMessageCountRef.current = messages.length;
    pending.forEach((item) => {
      if (!item?.text) return;
      logSessionMessage(item.role, item.text, item.variant === "action" || item.variant === "warn" ? "flow" : "message");
    });
  }, [messages, chatSessionId]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    fetch(`${hotelsApiBaseUrl}?locale=${locale}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!mounted) return;
        const next = Array.isArray(payload?.hotels) ? payload.hotels : [];
        setHotels(
          next.map((item: PublicHotel) => ({
            slug: String(item?.slug || ""),
            name: String(item?.name || ""),
            available: item?.available !== false,
          })),
        );
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [locale]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsExpanded(false);
      setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || feedbackAskedOnce || showFeedbackPrompt) return;
    if (messages.length < 2) return;
    const last = messages[messages.length - 1];
    if (last?.role !== "assistant") return;
    if (last?.variant === "error" || last?.variant === "meta") return;

    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setShowFeedbackPrompt(true);
      setFeedbackAskedOnce(true);
    }, 10000);

    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
    };
  }, [messages, isOpen, feedbackAskedOnce, showFeedbackPrompt]);

  useEffect(() => {
    if (!feedbackChoice) return;
    const timer = window.setTimeout(() => setFeedbackChoice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [feedbackChoice]);

  useEffect(() => {
    const today = getTodayIsoDate();
    if (reservationStep === "checkin") {
      const nextCheckin = reservationDraft.checkin && reservationDraft.checkin >= today ? reservationDraft.checkin : today;
      setCheckinPickerValue((prev) => (prev && prev >= today ? prev : nextCheckin));
      setDatePickerError("");
      return;
    }
    if (reservationStep === "checkout") {
      const minCheckout = reservationDraft.checkin && reservationDraft.checkin >= today ? reservationDraft.checkin : today;
      const nextCheckout =
        reservationDraft.checkout && reservationDraft.checkout >= minCheckout
          ? reservationDraft.checkout
          : reservationDraft.checkin
            ? reservationDraft.checkin
            : minCheckout;
      setCheckoutPickerValue((prev) => (prev && prev >= minCheckout ? prev : nextCheckout));
      setDatePickerError("");
      return;
    }
    if (reservationStep === "guests") {
      const nextAdults = Math.min(20, Math.max(1, Number.parseInt(String(reservationDraft.guests || "1"), 10) || 1));
      const maxChildren = Math.max(0, 20 - nextAdults);
      const nextChildren = Math.min(maxChildren, Math.max(0, Number.parseInt(String(reservationDraft.children || "0"), 10) || 0));
      setAdultGuestsValue(String(nextAdults));
      setChildGuestsValue(String(nextChildren));
      setAccessibleGuestValue(Boolean(reservationDraft.accessible));
      setGuestPickerError("");
      return;
    }
    if (reservationStep === "phone") {
      setPhoneValue(reservationDraft.phone || "");
      setPhoneError("");
      return;
    }
    setDatePickerError("");
    setGuestPickerError("");
    setPhoneError("");
  }, [
    reservationStep,
    reservationDraft.checkin,
    reservationDraft.checkout,
    reservationDraft.guests,
    reservationDraft.children,
    reservationDraft.accessible,
    reservationDraft.phone,
  ]);

  const handleFeedbackChoice = (choice: FeedbackChoice) => {
    setFeedbackChoice(choice);
    trackEvent("chat_feedback", { intent: choice });
    setShowFeedbackPrompt(false);
  };

  const ensureChatSession = async () => {
    if (chatSessionId) return chatSessionId;
    try {
      const response = await fetch(chatSessionsApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          sourcePage: typeof window !== "undefined" ? window.location.pathname : "/",
        }),
      });
      if (!response.ok) return "";
      const data = await response.json();
      const nextSessionId = String(data?.sessionId || "").trim();
      if (!nextSessionId) return "";
      loggedMessageCountRef.current = messages.length;
      setChatSessionId(nextSessionId);
      return nextSessionId;
    } catch {
      return "";
    }
  };

  const pushAssistantMessagesWithDelay = async (next: Message | Message[]) => {
    const rows = Array.isArray(next) ? next : [next];
    const personalizedRows = rows.map((item) =>
      item.role === "assistant" ? { ...item, text: personalizeAssistantText(item.text, item.variant) } : item,
    );
    setIsTyping(true);
    await wait(getAssistantDelayMs());
    setMessages((prev) => [...prev, ...personalizedRows]);
    setIsTyping(false);
  };

  const findReservationHotel = (slug: string) =>
    reservationHotelOptions.find((item) => normalizeForMatch(item.slug) === normalizeForMatch(slug));

  const createReservationLink = (draft: ReservationDraft) => {
    const query = new URLSearchParams();
    const selected = Array.from(new Set(draft.hotelSlugs.filter(Boolean)));
    if (selected.length === 1) query.set("hotel", selected[0]);
    if (selected.length > 1) query.set("hotels", selected.join(","));
    if (draft.checkin) query.set("checkin", draft.checkin);
    if (draft.checkout) query.set("checkout", draft.checkout);
    if (draft.guests) query.set("guests", draft.guests);
    if (draft.children) query.set("children", draft.children);
    if (draft.accessible) query.set("accessible", "1");
    if (draft.phone) query.set("phone", draft.phone);
    const path = `${reservationPath}${query.toString() ? `?${query.toString()}` : ""}`;
    return typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  };

  const sendChatQuoteRequest = (draft: ReservationDraft, normalizedPhone: string) => {
    const email = String(contactEmail || "").trim();
    if (!isValidFullName(contactFullName) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      trackEvent("chat_quote_request_mail", { intent: "skipped_missing_contact" });
      return;
    }

    const { firstName, lastName } = splitFullName(contactFullName);
    const selectedHotelNames = Array.from(
      new Set(
        draft.hotelSlugs
          .map((slug) => findReservationHotel(slug)?.name || slug)
          .map((item) => String(item || "").trim())
          .filter(Boolean),
      ),
    );
    const totalGuests = Math.max(1, (Number.parseInt(draft.guests || "1", 10) || 1) + (Number.parseInt(draft.children || "0", 10) || 0));
    const suggestedRooms = String(Math.max(1, Math.ceil(totalGuests / 2)));
    const purposeByLocale =
      locale === "tr"
        ? "Meri Chat uzerinden rezervasyon talebi"
        : locale === "de"
          ? "Reservierungsanfrage ueber Meri Chat"
          : "Reservation request via Meri Chat";
    const chatMessageHeader =
      locale === "tr"
        ? "Bu talep Meri AI Chat panelinden gonderildi."
        : locale === "de"
          ? "Diese Anfrage wurde ueber das Meri AI Chat-Panel gesendet."
          : "This inquiry was submitted via the Meri AI chat panel.";
    const quotePayload = {
      locale,
      sourcePage: "/chat-widget",
      firstName,
      lastName,
      company: "-",
      email,
      phone: normalizedPhone,
      purpose: purposeByLocale,
      nationality: "-",
      guests: draft.guests || "1",
      children: draft.children || "0",
      rooms: suggestedRooms,
      boarding: selectedHotelNames.join(", ") || "Meri Boarding",
      moveIn: draft.checkin || "",
      message: [
        chatMessageHeader,
        `Check-in: ${draft.checkin || "-"}`,
        `Check-out: ${draft.checkout || "-"}`,
        `Accessible guest request: ${draft.accessible ? "Yes" : "No"}`,
      ].join("\n"),
    };

    fetch(quoteFormApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quotePayload),
    })
      .then((response) => {
        trackEvent("chat_quote_request_mail", { intent: response.ok ? "sent" : "failed" });
        return null;
      })
      .catch(() => {
        trackEvent("chat_quote_request_mail", { intent: "failed" });
        return null;
      });
  };

  const handleHotelCheckboxToggle = (slug: string) => {
    if (isTyping || reservationStep !== "hotel") return;
    setReservationDraft((prev) => {
      const exists = prev.hotelSlugs.includes(slug);
      return {
        ...prev,
        hotelSlugs: exists ? prev.hotelSlugs.filter((item) => item !== slug) : [...prev.hotelSlugs, slug],
      };
    });
  };

  const handleHotelSelectionContinue = async () => {
    if (isTyping || reservationStep !== "hotel") return;
    const flowText = getReservationFlowText(locale);
    const selectedHotels = reservationDraft.hotelSlugs
      .map((slug) => findReservationHotel(slug) || { slug, name: slug, available: true })
      .filter((item) => String(item.slug || "").trim());
    if (!selectedHotels.length) {
      await pushAssistantMessagesWithDelay({ role: "assistant", text: flowText.unknownHotel, variant: "warn" });
      return;
    }

    const availableHotels = selectedHotels.filter((item) => item.available !== false);
    if (!availableHotels.length) {
      setReservationStep("idle");
      await pushAssistantMessagesWithDelay({ role: "assistant", text: flowText.unavailable, variant: "warn" });
      return;
    }

    await ensureChatSession();
    const selectedHotelNames = availableHotels.map((item) => item.name || item.slug).join(", ");
    setMessages((prev) => [...prev, { role: "user", text: labels.hotelPickerSelected(selectedHotelNames) }]);
    setReservationDraft((prev) => ({ ...prev, hotelSlugs: availableHotels.map((item) => item.slug) }));
    setReservationStep("checkin");
    await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.checkinAsk, variant: "action" });
    trackEvent("reservation_step", { intent: availableHotels.length > 1 ? "hotels_selected_multi" : "hotel_selected" });
  };

  const handleDatePickerContinue = async () => {
    if (isTyping) return;
    const today = getTodayIsoDate();

    if (reservationStep === "checkin") {
      const selectedCheckin = String(checkinPickerValue || "").trim();
      if (!selectedCheckin) {
        setDatePickerError(labels.badDate);
        return;
      }
      if (selectedCheckin < today) {
        setDatePickerError(labels.pastDate);
        return;
      }
      setDatePickerError("");
      setReservationDraft((prev) => ({
        ...prev,
        checkin: selectedCheckin,
        checkout: prev.checkout && prev.checkout >= selectedCheckin ? prev.checkout : "",
      }));
      setReservationStep("checkout");
      await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.checkoutAsk, variant: "action" });
      trackEvent("reservation_step", { intent: "checkin_set_picker" });
      return;
    }

    if (reservationStep === "checkout") {
      const selectedCheckout = String(checkoutPickerValue || "").trim();
      const minCheckout = reservationDraft.checkin && reservationDraft.checkin >= today ? reservationDraft.checkin : today;
      if (!selectedCheckout) {
        setDatePickerError(labels.badDate);
        return;
      }
      if (selectedCheckout < minCheckout) {
        setDatePickerError(labels.badCheckout);
        return;
      }
      setDatePickerError("");
      setReservationDraft((prev) => ({ ...prev, checkout: selectedCheckout }));
      setReservationStep("guests");
      await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.guestsAsk, variant: "action" });
      trackEvent("reservation_step", { intent: "checkout_set_picker" });
    }
  };

  const handleGuestPickerContinue = async () => {
    if (isTyping || reservationStep !== "guests") return;
    const adults = Number.parseInt(adultGuestsValue, 10);
    const children = Number.parseInt(childGuestsValue, 10);
    const total = adults + children;
    if (!Number.isFinite(adults) || !Number.isFinite(children) || adults < 1 || children < 0 || total < 1 || total > 20) {
      setGuestPickerError(labels.badGuests);
      return;
    }

    setGuestPickerError("");
    const draft = {
      ...reservationDraft,
      guests: String(adults),
      children: String(children),
      accessible: accessibleGuestValue,
    };
    setReservationDraft(draft);
    setReservationStep("phone");
    await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.phoneAsk, variant: "action" });
    trackEvent("reservation_step", { intent: "guests_set_picker" });
  };

  const handlePhoneContinue = async () => {
    if (isTyping || reservationStep !== "phone") return;
    const normalizedPhone = normalizePhoneInput(phoneValue);
    if (!isValidPhoneNumber(normalizedPhone)) {
      setPhoneError(labels.badPhone);
      return;
    }

    setPhoneError("");
    const draft = { ...reservationDraft, phone: normalizedPhone };
    setReservationDraft(draft);
    setReservationStep("idle");
    sendChatQuoteRequest(draft, normalizedPhone);
    await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.complete(createReservationLink(draft)), variant: "action" });
    trackEvent("reservation_flow_complete", { intent: "reservation_prefill_ready" });
  };

  const processUserMessage = async (trimmed: string, options?: { appendUserMessage?: boolean }) => {
    if (!trimmed) return;
    await ensureChatSession();
    if (options?.appendUserMessage !== false) {
      setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    }

    const flowText = getReservationFlowText(locale);
    const detectedHotelSlugs = detectHotelSlugs(trimmed, reservationHotelOptions);
    const selectedHotels = detectedHotelSlugs
      .map((slug) => findReservationHotel(slug) || { slug, name: slug, available: true })
      .filter((item) => String(item.slug || "").trim());
    const normalizeDate = (value: string) => parseFlexibleDate(value);

    let activeReservationStep = reservationStep;

    // If user asks a general info question while reservation flow is active,
    // gracefully exit flow and answer via normal chat/RAG.
    if (activeReservationStep !== "idle") {
      const hasDate = Boolean(normalizeDate(trimmed)) || Boolean(parseDateRange(trimmed));
      const looksLikeGuestCount = Number.isFinite(parseGuestCount(trimmed));
      if (!hasDate && !looksLikeGuestCount && (isGeneralInfoIntent(trimmed) || isPriceIntent(trimmed) || isAgentIntent(trimmed))) {
        activeReservationStep = "idle";
        setReservationStep("idle");
      }
    }

    if (
      activeReservationStep === "idle" &&
      isGreetingIntent(trimmed) &&
      !isReservationIntent(trimmed) &&
      !isPriceIntent(trimmed) &&
      !isGeneralInfoIntent(trimmed)
    ) {
      await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.greeting(preferredName), variant: "default" });
      trackEvent("chat_response", { intent: "greeting", model: "local_greeting" });
      return;
    }

    if (activeReservationStep === "hotel") {
      if (!selectedHotels.length) {
        await pushAssistantMessagesWithDelay({ role: "assistant", text: flowText.unknownHotel, variant: "default" });
        return;
      }
      const availableHotels = selectedHotels.filter((item) => item.available !== false);
      if (!availableHotels.length) {
        setReservationStep("idle");
        await pushAssistantMessagesWithDelay({ role: "assistant", text: flowText.unavailable, variant: "warn" });
        return;
      }
      setReservationDraft((prev) => ({ ...prev, hotelSlugs: availableHotels.map((item) => item.slug) }));
      setReservationStep("checkin");
      await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.checkinAsk, variant: "action" });
      trackEvent("reservation_step", { intent: availableHotels.length > 1 ? "hotels_selected_multi" : "hotel_selected" });
      return;
    }

    if (activeReservationStep === "checkin") {
      const today = getTodayIsoDate();
      const range = parseDateRange(trimmed);
      if (range) {
        if (range.checkin < today) {
          await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.pastDate, variant: "warn" });
          return;
        }
        if (range.checkout < range.checkin) {
          await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.badCheckout, variant: "warn" });
          return;
        }
        setReservationDraft((prev) => ({ ...prev, checkin: range.checkin, checkout: range.checkout }));
        setReservationStep("guests");
        await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.guestsAsk, variant: "action" });
        trackEvent("reservation_step", { intent: "checkin_checkout_set" });
        return;
      }
      const normalized = normalizeDate(trimmed);
      if (!normalized) {
        await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.badDate, variant: "warn" });
        return;
      }
      if (normalized < today) {
        await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.pastDate, variant: "warn" });
        return;
      }
      setReservationDraft((prev) => ({ ...prev, checkin: normalized }));
      setReservationStep("checkout");
      await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.checkoutAsk, variant: "action" });
      trackEvent("reservation_step", { intent: "checkin_set" });
      return;
    }

    if (activeReservationStep === "checkout") {
      const today = getTodayIsoDate();
      const normalized = normalizeDate(trimmed);
      if (!normalized) {
        await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.badDate, variant: "warn" });
        return;
      }
      if (normalized < today) {
        await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.pastDate, variant: "warn" });
        return;
      }
      const checkin = reservationDraft.checkin;
      if (checkin && normalized < checkin) {
        await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.badCheckout, variant: "warn" });
        return;
      }
      setReservationDraft((prev) => ({ ...prev, checkout: normalized }));
      setReservationStep("guests");
      await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.guestsAsk, variant: "action" });
      trackEvent("reservation_step", { intent: "checkout_set" });
      return;
    }

    if (activeReservationStep === "guests") {
      const guests = parseGuestCount(trimmed);
      if (!Number.isFinite(guests) || guests < 1 || guests > 20) {
        await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.badGuests, variant: "warn" });
        return;
      }
      const draft = { ...reservationDraft, guests: String(guests), children: "0", accessible: false };
      setReservationDraft(draft);
      setAdultGuestsValue(String(guests));
      setChildGuestsValue("0");
      setAccessibleGuestValue(false);
      setReservationStep("phone");
      await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.phoneAsk, variant: "action" });
      trackEvent("reservation_step", { intent: "guests_set" });
      return;
    }

    if (activeReservationStep === "phone") {
      const normalizedPhone = normalizePhoneInput(trimmed);
      if (!isValidPhoneNumber(normalizedPhone)) {
        await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.badPhone, variant: "warn" });
        return;
      }
      const draft = { ...reservationDraft, phone: normalizedPhone };
      setReservationDraft(draft);
      setPhoneValue(normalizedPhone);
      setReservationStep("idle");
      sendChatQuoteRequest(draft, normalizedPhone);
      await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.complete(createReservationLink(draft)), variant: "action" });
      trackEvent("reservation_flow_complete", { intent: "reservation_prefill_ready" });
      return;
    }

    if (isPriceIntent(trimmed)) {
      setReservationStep("idle");
      trackEvent("chat_handoff", { intent: "handoff" });
      await pushAssistantMessagesWithDelay([
        { role: "assistant", text: labels.priceRedirect, variant: "warn" },
        { role: "assistant", text: labels.handoff, variant: "action" },
      ]);
      return;
    }

    if (isAgentIntent(trimmed)) {
      setReservationStep("idle");
      trackEvent("chat_handoff", { intent: "agent_contact" });
      await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.handoff, variant: "action" });
      return;
    }

    if (isReservationIntent(trimmed)) {
      if (selectedHotels.length) {
        const availableHotels = selectedHotels.filter((item) => item.available !== false);
        if (!availableHotels.length) {
          await pushAssistantMessagesWithDelay({ role: "assistant", text: flowText.unavailable, variant: "warn" });
          return;
        }
        const nextHotelSlugs = availableHotels.map((item) => item.slug);
        const hotelLabel = availableHotels.map((item) => item.name || item.slug).join(", ");
        setReservationDraft((prev) => ({ ...prev, hotelSlugs: nextHotelSlugs }));
        setReservationStep("checkin");
        await pushAssistantMessagesWithDelay([
          {
            role: "assistant",
            text: flowText.available(hotelLabel, createReservationLink({ ...reservationDraft, hotelSlugs: nextHotelSlugs })),
            variant: "action",
          },
          { role: "assistant", text: labels.checkinAsk, variant: "action" },
        ]);
        return;
      }
      setReservationStep("hotel");
      await pushAssistantMessagesWithDelay({ role: "assistant", text: `${labels.reservationCardTitle}\n${flowText.askHotel}`, variant: "action" });
      trackEvent("reservation_flow_start", { intent: "hotel_selection_needed" });
      return;
    }

    setIsTyping(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);
    const startedAt = Date.now();

    try {
      const response = await fetch(chatApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          locale,
          sessionId: chatSessionId || undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Chat API failed (${response.status})`);
      }

      const payload = (await response.json()) as ChatApiResponse;
      const elapsed = Date.now() - startedAt;
      setAvgResponseMs((prev) => (prev <= 0 ? elapsed : Math.round(prev * 0.7 + elapsed * 0.3)));
      const answer = String(payload?.answer || "").trim() || t.thanks;
      const model = String(payload?.model || "").trim();
      const isPolicy = model === "policy_no_price" || model === "policy_fact_shortcut";
      const variant: Message["variant"] = isPolicy ? "warn" : "default";
      const nextMessages: Message[] = [
        {
          role: "assistant",
          text: personalizeAssistantText(answer, variant),
          variant,
        },
      ];

      if (model === "policy_no_price") {
        nextMessages.push({ role: "assistant", text: `${labels.policy}: ${labels.handoff}`, variant: "meta" });
      }

      await wait(getAssistantDelayMs());
      setMessages((prev) => [...prev, ...nextMessages]);
      trackEvent("chat_response", { intent: "qa", model, latencyMs: elapsed });
    } catch (_error) {
      await wait(getAssistantDelayMs());
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: getChatErrorText(locale),
          variant: "error",
        },
      ]);
    } finally {
      window.clearTimeout(timeoutId);
      setIsTyping(false);
    }
  };

  const handleContactSubmit = async () => {
    if (isTyping || contactCompleted) return;
    const fullName = contactFullName.trim().replace(/\s+/g, " ");
    const email = contactEmail.trim();
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidFullName(fullName) || !isEmailValid) {
      setContactError(labels.contactValidation);
      return;
    }

    setContactError("");
    await ensureChatSession();
    logSessionMessage("user", `contact_name:${fullName} | contact_email:${email}`, "contact");
    setContactCompleted(true);
    setContactRequested(false);
    setMessages((prev) => [...prev, { role: "assistant", text: labels.contactThanks, variant: "meta" }]);
    trackEvent("contact_collected", { intent: "name_email" });

    const queued = pendingFirstMessage.trim();
    setPendingFirstMessage("");
    if (queued) {
      await processUserMessage(queued, { appendUserMessage: false });
    }
  };

  const handleSend = async () => {
    if (isTyping) return;
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    setContactError("");

    if (!contactCompleted) {
      await ensureChatSession();
      setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
      setPendingFirstMessage(trimmed);
      setContactRequested(true);
      await pushAssistantMessagesWithDelay({ role: "assistant", text: labels.contactAsk, variant: "meta" });
      trackEvent("contact_gate_requested", { intent: "after_first_message" });
      return;
    }

    await processUserMessage(trimmed);
  };

  const handleQuickAction = (action: string) => {
    if (isTyping || needsContactInfo) return;
    const normalized = normalizeForMatch(action);
    if (/(rezerv|reserv|book)/.test(normalized)) {
      trackEvent("quick_action", { intent: "reservation" });
      setInput(locale === "tr" ? "Rezervasyon yapmak istiyorum" : locale === "de" ? "Ich moechte reservieren" : "I want to make a reservation");
      return;
    }
    if (/(pet|haustier|evcil)/.test(normalized)) {
      trackEvent("quick_action", { intent: "pet_policy" });
      setInput(
        locale === "tr"
          ? "Evcil hayvan kabul ediyor musunuz?"
          : locale === "de"
            ? "Sind Haustiere erlaubt?"
            : "Are pets allowed?",
      );
      return;
    }
    if (/(barriere|accessible|engelli|erisilebilir)/.test(normalized)) {
      trackEvent("quick_action", { intent: "accessibility" });
      setInput(
        locale === "tr"
          ? "Engelli erisimi uygun oda var mi?"
          : locale === "de"
            ? "Gibt es barrierefreie Zimmer?"
            : "Do you have accessible rooms?",
      );
      return;
    }
    trackEvent("quick_action", { intent: "handoff" });
    void pushAssistantMessagesWithDelay({ role: "assistant", text: labels.handoff, variant: "action" });
  };

  return (
    <div className={`chat-widget ${isOpen ? "is-open" : ""} ${isExpanded ? "is-expanded" : ""}`}>
      <button
        type="button"
        className="chat-toggle"
        aria-expanded={isOpen}
        aria-controls="meri-chat-panel"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t.toggle}
      >
        <span className="chat-toggle-label">{t.toggle}</span>
        <span className="chat-toggle-badge">{t.badge}</span>
        <i className="fa fa-comments" aria-hidden="true"></i>
      </button>

      <div id="meri-chat-panel" className="chat-panel" role="dialog" aria-modal={false} aria-label={t.panelTitle}>
        <div className="chat-panel-header">
          <div className="chat-header-brand">
            <div className="chat-avatar" aria-hidden="true">
              M
            </div>
            <div>
              <div className="chat-title-row">
                <div className="chat-panel-title">
                  <i className="fa fa-headset chat-title-icon" aria-hidden="true"></i>
                  {t.panelTitle}
                </div>
                <div className="chat-panel-meta">
                  {labels.locale} · {labels.online}
                  {avgResponseMs > 0 ? ` · ${labels.avgResponse} ${avgResponseMs}ms` : ""}
                </div>
              </div>
            </div>
          </div>
          <div className="chat-header-actions">
            <span className="chat-status-dot is-online" aria-label={t.badge}></span>
            <button
              type="button"
              className="chat-expand"
              aria-label={isExpanded ? t.collapse : t.expand}
              aria-pressed={isExpanded}
              onClick={() => setIsExpanded((prev) => !prev)}
            >
              <i className={`fa ${isExpanded ? "fa-compress" : "fa-expand"}`} aria-hidden="true"></i>
            </button>
            <button
              type="button"
              className="chat-close"
              aria-label={t.close}
              onClick={() => {
                setIsExpanded(false);
                setIsOpen(false);
              }}
            >
              <i className="fa fa-times" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        {showDataNotice ? (
          <div className="chat-data-notice">
            <span>
              {t.dataNotice} <Link href={privacyHref}>{t.dataNoticeLink}</Link>.
            </span>
            <button
              type="button"
              className="chat-data-notice-close"
              aria-label={t.close}
              onClick={() => setShowDataNotice(false)}
            >
              <i className="fa fa-times" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <div className="chat-panel-body" ref={listRef} role="log" aria-live="polite" aria-relevant="additions text">
          {showFeedbackPrompt ? (
            <div className="chat-feedback-banner">
              <div className="chat-feedback-label">{t.feedbackPrompt}</div>
              <div className="chat-feedback-actions">
                <button type="button" className="chat-quick-chip" onClick={() => handleFeedbackChoice("correct")}>
                  {t.feedbackHelpful}
                </button>
                <span className="chat-feedback-divider" aria-hidden="true" />
                <button type="button" className="chat-quick-chip" onClick={() => handleFeedbackChoice("incorrect")}>
                  {t.feedbackWrong}
                </button>
              </div>
            </div>
          ) : null}
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`chat-bubble ${message.role} ${message.variant || "default"}`}
            >
              {message.role === "assistant" ? (
                <span
                  dangerouslySetInnerHTML={{
                    __html: message.html || formatAssistantText(message.text),
                  }}
                />
              ) : (
                message.text
              )}
            </div>
          ))}
          {needsContactInfo ? (
            <div className="chat-contact-card" aria-label={labels.contactAsk}>
              <label htmlFor="chat-contact-fullname">{labels.contactNameLabel}</label>
              <input
                id="chat-contact-fullname"
                type="text"
                value={contactFullName}
                placeholder={labels.contactNamePlaceholder}
                onChange={(event) => {
                  setContactFullName(event.target.value);
                  if (contactError) setContactError("");
                }}
                disabled={isTyping}
              />
              <label htmlFor="chat-contact-email">{labels.contactEmailLabel}</label>
              <input
                id="chat-contact-email"
                type="email"
                value={contactEmail}
                placeholder={labels.contactEmailPlaceholder}
                onChange={(event) => {
                  setContactEmail(event.target.value);
                  if (contactError) setContactError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleContactSubmit();
                  }
                }}
                disabled={isTyping}
              />
              {contactError ? <div className="chat-contact-error">{contactError}</div> : null}
              <button type="button" onClick={() => void handleContactSubmit()} disabled={isTyping}>
                {labels.contactSubmit}
              </button>
            </div>
          ) : null}
          {reservationStep === "hotel" ? (
            <div className="chat-hotel-picker" aria-label={labels.hotelPickerTitle}>
              <div className="chat-hotel-picker-title">{labels.hotelPickerTitle}</div>
              <div className="chat-hotel-picker-help">{labels.hotelPickerHelp}</div>
              <div className="chat-hotel-picker-list">
                {reservationHotelOptions.map((hotel) => {
                  const checked = reservationDraft.hotelSlugs.includes(hotel.slug);
                  const unavailable = hotel.available === false;
                  return (
                    <label
                      key={hotel.slug}
                      className={`chat-hotel-picker-item ${checked ? "is-selected" : ""} ${unavailable ? "is-unavailable" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleHotelCheckboxToggle(hotel.slug)}
                        disabled={isTyping}
                      />
                      <span className="chat-hotel-picker-name">{hotel.name || hotel.slug}</span>
                      {unavailable ? <span className="chat-hotel-picker-status">{labels.hotelPickerUnavailable}</span> : null}
                    </label>
                  );
                })}
              </div>
              <button
                type="button"
                className="chat-hotel-picker-submit"
                onClick={() => void handleHotelSelectionContinue()}
                disabled={isTyping}
              >
                {labels.hotelPickerContinue}
              </button>
            </div>
          ) : null}
          {reservationStep === "checkin" || reservationStep === "checkout" ? (
            <div className="chat-date-picker" aria-label={reservationStep === "checkin" ? labels.datePickerTitleCheckin : labels.datePickerTitleCheckout}>
              <div className="chat-date-picker-title">
                {reservationStep === "checkin" ? labels.datePickerTitleCheckin : labels.datePickerTitleCheckout}
              </div>
              <input
                type="date"
                value={reservationStep === "checkin" ? checkinPickerValue : checkoutPickerValue}
                min={reservationStep === "checkin" ? getTodayIsoDate() : reservationDraft.checkin || getTodayIsoDate()}
                onChange={(event) => {
                  if (reservationStep === "checkin") {
                    setCheckinPickerValue(event.target.value);
                  } else {
                    setCheckoutPickerValue(event.target.value);
                  }
                  if (datePickerError) setDatePickerError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleDatePickerContinue();
                  }
                }}
                disabled={isTyping}
              />
              {datePickerError ? <div className="chat-contact-error">{datePickerError}</div> : null}
              <button type="button" className="chat-date-picker-submit" onClick={() => void handleDatePickerContinue()} disabled={isTyping}>
                {labels.datePickerContinue}
              </button>
            </div>
          ) : null}
          {reservationStep === "guests" ? (
            <div className="chat-guest-picker" aria-label={labels.guestPickerTitle}>
              <div className="chat-guest-picker-title">{labels.guestPickerTitle}</div>
              <label htmlFor="chat-guest-adults">{labels.adultGuestsLabel}</label>
              <select
                id="chat-guest-adults"
                value={adultGuestsValue}
                onChange={(event) => {
                  const nextAdults = Math.min(20, Math.max(1, Number.parseInt(event.target.value, 10) || 1));
                  const maxChildren = Math.max(0, 20 - nextAdults);
                  setAdultGuestsValue(String(nextAdults));
                  setChildGuestsValue((prev) => {
                    const current = Number.parseInt(prev, 10);
                    return String(Math.max(0, Math.min(Number.isFinite(current) ? current : 0, maxChildren)));
                  });
                  if (guestPickerError) setGuestPickerError("");
                }}
                disabled={isTyping}
              >
                {Array.from({ length: 20 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <label htmlFor="chat-guest-children">{labels.childGuestsLabel}</label>
              <select
                id="chat-guest-children"
                value={childGuestsValue}
                onChange={(event) => {
                  setChildGuestsValue(event.target.value);
                  if (guestPickerError) setGuestPickerError("");
                }}
                disabled={isTyping}
              >
                {Array.from({ length: Math.max(0, 21 - (Number.parseInt(adultGuestsValue, 10) || 1)) }, (_, index) => index).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <label className="chat-guest-picker-checkbox">
                <input
                  type="checkbox"
                  checked={accessibleGuestValue}
                  onChange={(event) => {
                    setAccessibleGuestValue(event.target.checked);
                    if (guestPickerError) setGuestPickerError("");
                  }}
                  disabled={isTyping}
                />
                <span>{labels.accessibleGuestLabel}</span>
              </label>
              {guestPickerError ? <div className="chat-contact-error">{guestPickerError}</div> : null}
              <button type="button" className="chat-guest-picker-submit" onClick={() => void handleGuestPickerContinue()} disabled={isTyping}>
                {labels.guestPickerContinue}
              </button>
            </div>
          ) : null}
          {reservationStep === "phone" ? (
            <div className="chat-phone-card" aria-label={labels.phoneAsk}>
              <label htmlFor="chat-phone-input">{labels.phoneInputLabel}</label>
              <input
                id="chat-phone-input"
                type="tel"
                value={phoneValue}
                placeholder={labels.phoneInputPlaceholder}
                onChange={(event) => {
                  setPhoneValue(event.target.value);
                  if (phoneError) setPhoneError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handlePhoneContinue();
                  }
                }}
                disabled={isTyping}
              />
              {phoneError ? <div className="chat-contact-error">{phoneError}</div> : null}
              <button type="button" className="chat-phone-card-submit" onClick={() => void handlePhoneContinue()} disabled={isTyping}>
                {labels.phoneContinue}
              </button>
            </div>
          ) : null}
          {feedbackChoice ? <div className="chat-feedback-saved">{t.feedbackSaved}</div> : null}
          {isTyping && (
            <div className="chat-typing" aria-live="polite">
              <span className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
              {t.typing}
            </div>
          )}
        </div>

        <div className="chat-panel-footer">
          <div className="chat-quick-actions">
            {labels.quickActions.map((action) => (
              <button
                key={action}
                type="button"
                className="chat-quick-chip"
                onClick={() => handleQuickAction(action)}
                disabled={isTyping || needsContactInfo}
              >
                {action}
              </button>
            ))}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={input}
            placeholder={needsContactInfo ? labels.contactPending : t.placeholder}
            disabled={isTyping || needsContactInfo}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
          <button
            type="button"
            className="chat-send-button"
            onClick={() => void handleSend()}
            disabled={isTyping || needsContactInfo}
          >
            <i className="fa fa-paper-plane" aria-hidden="true" style={{ marginRight: 6 }} />
            <span>{t.send}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
