"use client";

import { useEffect, useRef, useState } from "react";
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
      quickActions: ["Rezervasyon", "Fiyat", "Check-in/out", "Temsilci"],
      policy: "Politika",
      reservationCardTitle: "Hizli Rezervasyon Akisi",
      checkinAsk: "Lutfen giris tarihini YYYY-MM-DD formatinda yazin.",
      checkoutAsk: "Lutfen cikis tarihini YYYY-MM-DD formatinda yazin.",
      guestsAsk: "Lutfen misafir sayisini yazin (1-20).",
      badDate: "Tarih formati gecersiz. Ornekler: 2026-03-15, 15.03.2026, yarin",
      badCheckout: "Cikis tarihi, giris tarihinden once olamaz.",
      badGuests: "Misafir sayisi 1 ile 20 arasinda olmalidir.",
      complete: (link: string) => `Harika, bilgileri tamamladik. Buradan devam edebilirsiniz: ${link}`,
      handoff: "Musteri temsilcisine baglan: +49 152 064 19253 | reservation@meri-group.de",
      lowConfidence: "Bu bilgi sinirli olabilir. Gerekirse temsilciye yonlendirebilirim.",
    };
  }
  if (locale === "de") {
    return {
      locale: "DE",
      online: "Online",
      avgResponse: "Ø Antwort",
      quickActions: ["Reservierung", "Preis", "Check-in/out", "Kontakt"],
      policy: "Richtlinie",
      reservationCardTitle: "Schneller Reservierungsablauf",
      checkinAsk: "Bitte geben Sie das Check-in Datum im Format YYYY-MM-DD ein.",
      checkoutAsk: "Bitte geben Sie das Check-out Datum im Format YYYY-MM-DD ein.",
      guestsAsk: "Bitte geben Sie die Gaestezahl ein (1-20).",
      badDate: "Ungueltiges Datumsformat. Beispiele: 2026-03-15, 15.03.2026, morgen",
      badCheckout: "Check-out darf nicht vor Check-in liegen.",
      badGuests: "Die Gaestezahl muss zwischen 1 und 20 liegen.",
      complete: (link: string) => `Perfekt, wir haben alles. Hier koennen Sie fortfahren: ${link}`,
      handoff: "Direkter Kontakt: +49 152 064 19253 | reservation@meri-group.de",
      lowConfidence: "Diese Information kann begrenzt sein. Ich kann Sie an unser Team weiterleiten.",
    };
  }
  return {
    locale: "EN",
    online: "Online",
    avgResponse: "Avg response",
    quickActions: ["Reservation", "Price", "Check-in/out", "Agent"],
    policy: "Policy",
    reservationCardTitle: "Quick Reservation Flow",
    checkinAsk: "Please enter check-in date in YYYY-MM-DD format.",
    checkoutAsk: "Please enter check-out date in YYYY-MM-DD format.",
    guestsAsk: "Please enter number of guests (1-20).",
    badDate: "Invalid date format. Examples: 2026-03-15, 15/03/2026, tomorrow",
    badCheckout: "Check-out cannot be before check-in.",
    badGuests: "Guest count must be between 1 and 20.",
    complete: (link: string) => `Great, we captured the details. Continue here: ${link}`,
    handoff: "Contact reservation team: +49 152 064 19253 | reservation@meri-group.de",
    lowConfidence: "This answer may be limited. I can connect you to our team if needed.",
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

function detectHotelSlug(input: string, hotels: PublicHotel[]) {
  const q = normalizeForMatch(input);
  if (!q) return "";

  const aliasMap: Array<{ slug: string; aliases: string[] }> = [
    { slug: "europaplatz", aliases: ["europaplatz", "europa platz", "europa"] },
    { slug: "flamingo", aliases: ["flamingo"] },
    { slug: "hildesheim", aliases: ["hildesheim"] },
  ];

  for (const item of aliasMap) {
    if (item.aliases.some((a) => q.includes(a))) return item.slug;
  }

  for (const hotel of hotels) {
    const slug = normalizeForMatch(hotel.slug || "");
    const name = normalizeForMatch(hotel.name || "");
    if (slug && q.includes(slug)) return hotel.slug;
    if (name && q.includes(name)) return hotel.slug;
  }

  return "";
}

function getReservationFlowText(locale: Locale) {
  if (locale === "tr") {
    return {
      askHotel:
        "Memnuniyetle yardimci olayim. Hangi oteli secmek istersiniz?\n- Europaplatz\n- Flamingo\n- Hildesheim",
      unknownHotel:
        "Anlayamadim. Lutfen su otellerden birini yazin: Europaplatz, Flamingo veya Hildesheim.",
      available: (hotelName: string, link: string) =>
        `${hotelName} icin su an uygunluk gorunuyor. Rezervasyon formuna buradan gecebilirsiniz: ${link}`,
      unavailable:
        "Su an bu otelde bos yer gorunmuyor. Dilerseniz rezervasyon ekibimizle iletisime gecebilirsiniz: +49 152 064 19253 veya reservation@meri-group.de.",
    };
  }
  if (locale === "de") {
    return {
      askHotel:
        "Gern helfe ich Ihnen weiter. Welches Hotel moechten Sie auswaehlen?\n- Europaplatz\n- Flamingo\n- Hildesheim",
      unknownHotel:
        "Ich konnte das Hotel nicht erkennen. Bitte waehlen Sie: Europaplatz, Flamingo oder Hildesheim.",
      available: (hotelName: string, link: string) =>
        `Fuer ${hotelName} ist aktuell Verfuegbarkeit sichtbar. Sie koennen hier direkt zur Reservierungsseite gehen: ${link}`,
      unavailable:
        "Aktuell sehen wir dort keine freie Verfuegbarkeit. Gern hilft unser Reservierungsteam weiter: +49 152 064 19253 oder reservation@meri-group.de.",
    };
  }
  return {
    askHotel:
      "Happy to help with that. Which hotel would you like to select?\n- Europaplatz\n- Flamingo\n- Hildesheim",
    unknownHotel:
      "I could not identify the hotel. Please choose one of these: Europaplatz, Flamingo, or Hildesheim.",
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

  const lower = raw.toLowerCase().replace(/\s+/g, " ").trim();
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

export default function ChatWidget({ locale: localeProp }: ChatWidgetProps) {
  const activeLocale = useLocale();
  const locale = activeLocale ?? localeProp ?? "de";
  const t = getMessages(locale).chatWidget;
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => initialMessages(t));
  const [input, setInput] = useState("");
  const [stage, setStage] = useState<"collect" | "ready">("collect");
  const [contactDraft, setContactDraft] = useState({ name: "", email: "" });
  const [contactError, setContactError] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [reservationStep, setReservationStep] = useState<"idle" | "hotel" | "checkin" | "checkout" | "guests">("idle");
  const [avgResponseMs, setAvgResponseMs] = useState<number>(0);
  const [chatSessionId, setChatSessionId] = useState("");
  const [hotels, setHotels] = useState<PublicHotel[]>([]);
  const [reservationDraft, setReservationDraft] = useState<{ hotelSlug: string; checkin: string; checkout: string; guests: string }>({
    hotelSlug: "",
    checkin: "",
    checkout: "",
    guests: "",
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const loggedMessageCountRef = useRef(0);
  const normalizedName = contactDraft.name.trim();
  const normalizedEmail = contactDraft.email.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const labels = getUiLabels(locale);
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
    if (stage === "collect") {
      nameRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  }, [isOpen, stage]);

  useEffect(() => {
    if (isOpen) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isOpen, isTyping]);

  useEffect(() => {
    const localeMessages = getMessages(locale).chatWidget;
    setMessages(initialMessages(localeMessages));
    setInput("");
    setStage("collect");
    setContactDraft({ name: "", email: "" });
    setContactError("");
    setIsTyping(false);
    setReservationStep("idle");
    setReservationDraft({ hotelSlug: "", checkin: "", checkout: "", guests: "" });
    setChatSessionId("");
    loggedMessageCountRef.current = 0;
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

  const handleSend = async () => {
    if (stage !== "ready" || isTyping) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    const flowText = getReservationFlowText(locale);
    const hotelSlug = detectHotelSlug(trimmed, hotels);
    const selectedHotel = hotelSlug
      ? hotels.find((h) => normalizeForMatch(h.slug) === normalizeForMatch(hotelSlug)) || { slug: hotelSlug, name: hotelSlug, available: true }
      : undefined;
    const reservationPath = localePath(locale, "/reservation");
    const createReservationLink = (draft: { hotelSlug: string; checkin: string; checkout: string; guests: string }) => {
      const query = new URLSearchParams();
      if (draft.hotelSlug) query.set("hotel", draft.hotelSlug);
      if (draft.checkin) query.set("checkin", draft.checkin);
      if (draft.checkout) query.set("checkout", draft.checkout);
      if (draft.guests) query.set("guests", draft.guests);
      const path = `${reservationPath}${query.toString() ? `?${query.toString()}` : ""}`;
      return typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    };
    const normalizeDate = (value: string) => parseFlexibleDate(value);

    if (reservationStep === "hotel") {
      if (!selectedHotel) {
        setMessages((prev) => [...prev, { role: "assistant", text: flowText.unknownHotel, variant: "default" }]);
        return;
      }
      if (selectedHotel.available === false) {
        setReservationStep("idle");
        setMessages((prev) => [...prev, { role: "assistant", text: flowText.unavailable, variant: "warn" }]);
        return;
      }
      setReservationDraft((prev) => ({ ...prev, hotelSlug: selectedHotel.slug }));
      setReservationStep("checkin");
      setMessages((prev) => [...prev, { role: "assistant", text: labels.checkinAsk, variant: "action" }]);
      trackEvent("reservation_step", { intent: "hotel_selected" });
      return;
    }

    if (reservationStep === "checkin") {
      const normalized = normalizeDate(trimmed);
      if (!normalized) {
        setMessages((prev) => [...prev, { role: "assistant", text: labels.badDate, variant: "warn" }]);
        return;
      }
      setReservationDraft((prev) => ({ ...prev, checkin: normalized }));
      setReservationStep("checkout");
      setMessages((prev) => [...prev, { role: "assistant", text: labels.checkoutAsk, variant: "action" }]);
      trackEvent("reservation_step", { intent: "checkin_set" });
      return;
    }

    if (reservationStep === "checkout") {
      const normalized = normalizeDate(trimmed);
      if (!normalized) {
        setMessages((prev) => [...prev, { role: "assistant", text: labels.badDate, variant: "warn" }]);
        return;
      }
      const checkin = reservationDraft.checkin;
      if (checkin && normalized < checkin) {
        setMessages((prev) => [...prev, { role: "assistant", text: labels.badCheckout, variant: "warn" }]);
        return;
      }
      setReservationDraft((prev) => ({ ...prev, checkout: normalized }));
      setReservationStep("guests");
      setMessages((prev) => [...prev, { role: "assistant", text: labels.guestsAsk, variant: "action" }]);
      trackEvent("reservation_step", { intent: "checkout_set" });
      return;
    }

    if (reservationStep === "guests") {
      const guests = Number(trimmed);
      if (!Number.isFinite(guests) || guests < 1 || guests > 20) {
        setMessages((prev) => [...prev, { role: "assistant", text: labels.badGuests, variant: "warn" }]);
        return;
      }
      const draft = { ...reservationDraft, guests: String(guests) };
      setReservationDraft(draft);
      setReservationStep("idle");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: labels.complete(createReservationLink(draft)), variant: "action" },
      ]);
      trackEvent("reservation_flow_complete", { intent: "reservation_prefill_ready" });
      return;
    }

    if (isReservationIntent(trimmed)) {
      if (selectedHotel) {
        if (selectedHotel.available === false) {
          setMessages((prev) => [...prev, { role: "assistant", text: flowText.unavailable, variant: "warn" }]);
          return;
        }
        const hotelLabel = selectedHotel.name || selectedHotel.slug;
        setReservationDraft((prev) => ({ ...prev, hotelSlug: selectedHotel.slug }));
        setReservationStep("checkin");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: flowText.available(hotelLabel, createReservationLink({ ...reservationDraft, hotelSlug: selectedHotel.slug })), variant: "action" },
          { role: "assistant", text: labels.checkinAsk, variant: "action" },
        ]);
        return;
      }
      setReservationStep("hotel");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `${labels.reservationCardTitle}\n${flowText.askHotel}`, variant: "action" },
      ]);
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
          text: answer,
          variant,
        },
      ];

      if (model === "policy_no_price") {
        nextMessages.push({ role: "assistant", text: `${labels.policy}: ${labels.handoff}`, variant: "meta" });
      }

      setMessages((prev) => [...prev, ...nextMessages]);
      trackEvent("chat_response", { intent: "qa", model, latencyMs: elapsed });
    } catch (_error) {
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

  const handleQuickAction = (action: string) => {
    if (stage !== "ready" || isTyping) return;
    if (action.includes("erv")) {
      trackEvent("quick_action", { intent: "reservation" });
      setInput(locale === "tr" ? "Rezervasyon yapmak istiyorum" : locale === "de" ? "Ich moechte reservieren" : "I want to make a reservation");
      return;
    }
    if (action.includes("iyat") || action.includes("Preis") || action.includes("Price")) {
      trackEvent("quick_action", { intent: "price" });
      setInput(locale === "tr" ? "Fiyat bilgisi alabilir miyim?" : locale === "de" ? "Kann ich den Preis erfahren?" : "Can I get pricing information?");
      return;
    }
    if (action.includes("Check")) {
      trackEvent("quick_action", { intent: "checkin_checkout" });
      setInput(locale === "tr" ? "Check-in ve check-out saatleri nedir?" : locale === "de" ? "Wann sind Check-in und Check-out?" : "What are check-in and check-out times?");
      return;
    }
    trackEvent("quick_action", { intent: "handoff" });
    setMessages((prev) => [...prev, { role: "assistant", text: labels.handoff, variant: "action" }]);
  };

  const handleContactSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = normalizedName;
    const email = normalizedEmail;
    if (!name) return;
    if (!isEmailValid) {
      setContactError(t.emailInvalid);
      return;
    }

    setContactError("");
    setContactDraft({ name, email });
    setIsTyping(true);

    let nextSessionId = "";
    try {
      const response = await fetch(chatSessionsApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          locale,
          sourcePage: typeof window !== "undefined" ? window.location.pathname : "/",
        }),
      });
      if (response.ok) {
        const data = await response.json();
        nextSessionId = String(data?.sessionId || "");
      }
    } catch {
      nextSessionId = "";
    }

    setChatSessionId(nextSessionId);
    loggedMessageCountRef.current = messages.length;
    setStage("ready");

    const safeName = escapeHtml(name || t.fallbackName);
    const greetingText = t.greeting.replace("{{name}}", name || t.fallbackName);
    const greetingHtml = t.greeting.replace("{{name}}", `<strong>${safeName}</strong>`);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: greetingText,
        html: greetingHtml,
      },
    ]);
    setIsTyping(false);
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
            <div className="chat-panel-title">
              <i className="fa fa-headset chat-title-icon" aria-hidden="true"></i>
              {t.panelTitle}
            </div>
            <div className="chat-panel-meta">{labels.locale} · {labels.online}{avgResponseMs > 0 ? ` · ${labels.avgResponse} ${avgResponseMs}ms` : ""}</div>
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

        <div className="chat-panel-body" ref={listRef} role="log" aria-live="polite" aria-relevant="additions text">
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
          {stage === "collect" && (
            <form className="chat-contact-card" onSubmit={handleContactSubmit}>
              <label htmlFor="chat-name">{t.fullName}</label>
              <input
                ref={nameRef}
                id="chat-name"
                type="text"
                value={contactDraft.name}
                onChange={(event) => {
                  setContactDraft((prev) => ({ ...prev, name: event.target.value }));
                  if (contactError) setContactError("");
                }}
                placeholder={t.namePlaceholder}
                autoComplete="name"
                required
              />
              <label htmlFor="chat-email">{t.email}</label>
              <input
                id="chat-email"
                type="email"
                value={contactDraft.email}
                onChange={(event) => {
                  setContactDraft((prev) => ({ ...prev, email: event.target.value }));
                  if (contactError) setContactError("");
                }}
                placeholder={t.emailPlaceholder}
                autoComplete="email"
                required
              />
              {contactError ? (
                <p className="chat-contact-error" role="alert">
                  {contactError}
                </p>
              ) : null}
              <button type="submit" disabled={!normalizedName || !isEmailValid}>
                {t.continue}
              </button>
            </form>
          )}
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

        {stage === "ready" && (
          <div className="chat-panel-footer">
            <div className="chat-quick-actions">
              {labels.quickActions.map((action) => (
                <button key={action} type="button" className="chat-quick-chip" onClick={() => handleQuickAction(action)}>
                  {action}
                </button>
              ))}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              placeholder={t.placeholder}
              disabled={isTyping}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSend();
                }
              }}
            />
            <button type="button" className="chat-send-button" onClick={() => void handleSend()} disabled={isTyping}>
              {t.send}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
