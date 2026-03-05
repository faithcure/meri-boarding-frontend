"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { withPublicApiBaseIfNeeded } from "@/lib/apiBaseUrl";

type AnalyticsLocale = "de" | "en" | "tr";
type AnalyticsEventType = "page_view" | "page_leave" | "click";
type AnalyticsDeviceType = "mobile" | "tablet" | "desktop";
type ScreenCategory = "sm" | "md" | "lg" | "xl";

type AnalyticsPayload = {
  eventType: AnalyticsEventType;
  visitorId: string;
  visitId: string;
  sessionId?: string;
  locale: AnalyticsLocale;
  pagePath: string;
  pageTitle?: string;
  referrerPath?: string;
  referrerHost?: string;
  durationMs?: number;
  clickLabel?: string;
  clickHref?: string;
  clickTag?: string;
  deviceType?: AnalyticsDeviceType;
  browser?: string;
  screenCategory?: ScreenCategory;
  isEntrance?: boolean;
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
};

type VisitContext = {
  visitId: string;
  startedAt: number;
  lastSeenAt: number;
  landingPath: string;
  referrerPath: string;
  referrerHost: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
};

const analyticsEndpoint = withPublicApiBaseIfNeeded("/api/v1/public/analytics/events");
const analyticsVisitorStorageKey = "meri_analytics_visitor_id";
const analyticsVisitStorageKey = "meri_analytics_visit";
const analyticsVisitTimeoutMs = 30 * 60 * 1000;

function normalizeLocale(input: string | undefined): AnalyticsLocale {
  const value = String(input || "").trim().toLowerCase();
  if (value === "de" || value === "tr") return value;
  return "en";
}

function detectLocaleFromPath(pathname: string): AnalyticsLocale {
  const segment = String(pathname || "").split("/")[1] || "";
  return normalizeLocale(segment);
}

function normalizePath(input: string | undefined) {
  const value = String(input || "").trim();
  if (!value) return "/";
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      return `${parsed.pathname || "/"}${parsed.search || ""}`.slice(0, 320);
    } catch {
      return "/";
    }
  }
  return (value.startsWith("/") ? value : `/${value}`).slice(0, 320);
}

function normalizeText(input: string | undefined, max = 220) {
  return String(input || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeHref(input: string | undefined) {
  const value = String(input || "").trim().slice(0, 400);
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return value.startsWith("/") ? value : `/${value}`;
}

function createClientId() {
  if (typeof window === "undefined") return "";
  return typeof window.crypto?.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getOrCreateAnalyticsVisitorId() {
  if (typeof window === "undefined") return "";
  const existing = String(window.localStorage.getItem(analyticsVisitorStorageKey) || "").trim();
  if (existing) return existing;
  const created = createClientId();
  window.localStorage.setItem(analyticsVisitorStorageKey, created);
  return created;
}

function getCurrentQueryParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  try {
    return new URLSearchParams(window.location.search || "");
  } catch {
    return new URLSearchParams();
  }
}

function getReferrerInfo() {
  if (typeof document === "undefined") {
    return { referrerPath: "", referrerHost: "" };
  }

  const rawReferrer = String(document.referrer || "").trim();
  if (!rawReferrer) {
    return { referrerPath: "", referrerHost: "" };
  }

  try {
    const parsed = new URL(rawReferrer);
    return {
      referrerPath: normalizePath(`${parsed.pathname || "/"}${parsed.search || ""}`),
      referrerHost: normalizeText(parsed.host || "", 120).toLowerCase(),
    };
  } catch {
    return { referrerPath: "", referrerHost: "" };
  }
}

function buildVisitContext(pathname: string): VisitContext {
  const now = Date.now();
  const params = getCurrentQueryParams();
  const referrer = getReferrerInfo();

  return {
    visitId: createClientId(),
    startedAt: now,
    lastSeenAt: now,
    landingPath: normalizePath(pathname),
    referrerPath: referrer.referrerPath,
    referrerHost: referrer.referrerHost,
    source: normalizeText(params.get("utm_source") || "", 120),
    medium: normalizeText(params.get("utm_medium") || "", 120),
    campaign: normalizeText(params.get("utm_campaign") || "", 160),
    term: normalizeText(params.get("utm_term") || "", 160),
    content: normalizeText(params.get("utm_content") || "", 160),
  };
}

function readVisitContext(): VisitContext | null {
  if (typeof window === "undefined") return null;
  const raw = String(window.localStorage.getItem(analyticsVisitStorageKey) || "").trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<VisitContext>;
    const visitId = String(parsed.visitId || "").trim();
    if (!visitId) return null;

    return {
      visitId,
      startedAt: Number(parsed.startedAt || 0),
      lastSeenAt: Number(parsed.lastSeenAt || 0),
      landingPath: normalizePath(parsed.landingPath),
      referrerPath: normalizePath(parsed.referrerPath),
      referrerHost: normalizeText(parsed.referrerHost || "", 120).toLowerCase(),
      source: normalizeText(parsed.source || "", 120),
      medium: normalizeText(parsed.medium || "", 120),
      campaign: normalizeText(parsed.campaign || "", 160),
      term: normalizeText(parsed.term || "", 160),
      content: normalizeText(parsed.content || "", 160),
    };
  } catch {
    return null;
  }
}

function persistVisitContext(context: VisitContext) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(analyticsVisitStorageKey, JSON.stringify(context));
}

function getOrCreateVisitContext(pathname: string) {
  const current = readVisitContext();
  const now = Date.now();

  if (!current || !current.lastSeenAt || now - current.lastSeenAt > analyticsVisitTimeoutMs) {
    const created = buildVisitContext(pathname);
    persistVisitContext(created);
    return { context: created, isNewVisit: true };
  }

  const next: VisitContext = {
    ...current,
    lastSeenAt: now,
  };
  persistVisitContext(next);
  return { context: next, isNewVisit: false };
}

function touchVisitContext() {
  const current = readVisitContext();
  if (!current) return;
  persistVisitContext({
    ...current,
    lastSeenAt: Date.now(),
  });
}

function detectBrowser() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/edg\//i.test(ua)) return "edge";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "opera";
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return "chrome";
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return "safari";
  if (/firefox\//i.test(ua)) return "firefox";
  if (/msie|trident/i.test(ua)) return "ie";
  return "unknown";
}

function detectDeviceType(): AnalyticsDeviceType {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  const width = typeof window !== "undefined" ? window.innerWidth : 1440;
  if (/ipad|tablet/i.test(ua) || (width >= 768 && width < 1024 && /android/i.test(ua))) return "tablet";
  if (/mobi|iphone|android/i.test(ua) || width < 768) return "mobile";
  return "desktop";
}

function detectScreenCategory(): ScreenCategory {
  const width = typeof window !== "undefined" ? window.innerWidth : 1440;
  if (width < 640) return "sm";
  if (width < 1024) return "md";
  if (width < 1440) return "lg";
  return "xl";
}

function sendAnalyticsEvent(payload: AnalyticsPayload, useBeacon = false) {
  if (!analyticsEndpoint || typeof window === "undefined") return;
  const body = JSON.stringify(payload);

  if (useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(analyticsEndpoint, blob);
    return;
  }

  void fetch(analyticsEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

type SiteAnalyticsTrackerProps = {
  locale?: AnalyticsLocale;
};

export default function SiteAnalyticsTracker({ locale }: SiteAnalyticsTrackerProps = {}) {
  const pathname = usePathname() || "/";
  const visitorIdRef = useRef("");
  const visitIdRef = useRef("");
  const currentPathRef = useRef("/");
  const currentLocaleRef = useRef<AnalyticsLocale>(normalizeLocale(locale || detectLocaleFromPath(pathname)));
  const currentPathStartedAtRef = useRef<number>(0);

  const flushPageDuration = (useBeacon = false) => {
    const visitorId = visitorIdRef.current;
    const visitId = visitIdRef.current;
    const activePath = normalizePath(currentPathRef.current);
    const startedAt = currentPathStartedAtRef.current;
    if (!visitorId || !visitId || !activePath || !startedAt) return;

    const durationMs = Math.max(0, Date.now() - startedAt);
    if (durationMs < 300) return;

    sendAnalyticsEvent(
      {
        eventType: "page_leave",
        visitorId,
        visitId,
        sessionId: visitorId,
        locale: currentLocaleRef.current,
        pagePath: activePath,
        durationMs,
      },
      useBeacon,
    );
    touchVisitContext();
  };

  useEffect(() => {
    visitorIdRef.current = getOrCreateAnalyticsVisitorId();
    currentPathRef.current = normalizePath(pathname);
    currentLocaleRef.current = normalizeLocale(locale || detectLocaleFromPath(pathname));
    currentPathStartedAtRef.current = Date.now();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const nextPath = normalizePath(pathname);
    const nextLocale = normalizeLocale(locale || detectLocaleFromPath(nextPath));
    const visitorId = visitorIdRef.current || getOrCreateAnalyticsVisitorId();
    if (!visitorId) return;

    const previousPath = currentPathRef.current;
    const isPathChange = previousPath && previousPath !== nextPath;

    if (isPathChange) {
      flushPageDuration(false);
    }

    const { context, isNewVisit } = getOrCreateVisitContext(nextPath);
    visitIdRef.current = context.visitId;

    sendAnalyticsEvent({
      eventType: "page_view",
      visitorId,
      visitId: context.visitId,
      sessionId: visitorId,
      locale: nextLocale,
      pagePath: nextPath,
      pageTitle: typeof document !== "undefined" ? normalizeText(document.title, 180) : "",
      referrerPath: isNewVisit ? context.referrerPath : normalizePath(previousPath),
      referrerHost: isNewVisit ? context.referrerHost : "",
      deviceType: detectDeviceType(),
      browser: detectBrowser(),
      screenCategory: detectScreenCategory(),
      isEntrance: isNewVisit,
      source: context.source,
      medium: context.medium,
      campaign: context.campaign,
      term: context.term,
      content: context.content,
    });

    currentLocaleRef.current = nextLocale;
    currentPathRef.current = nextPath;
    currentPathStartedAtRef.current = Date.now();
    touchVisitContext();
  }, [locale, pathname]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const targetElement = (event.target as Element | null)?.closest(
        "a,button,[role='button'],input[type='submit'],input[type='button']",
      ) as HTMLElement | null;
      if (!targetElement) return;

      const visitorId = visitorIdRef.current;
      const visitId = visitIdRef.current;
      if (!visitorId || !visitId) return;

      const rawLabel =
        targetElement.getAttribute("data-analytics-label") ||
        targetElement.getAttribute("aria-label") ||
        targetElement.textContent ||
        targetElement.id ||
        targetElement.tagName;
      const clickLabel = normalizeText(rawLabel || "", 160);
      if (!clickLabel) return;

      const maybeHref =
        targetElement instanceof HTMLAnchorElement
          ? targetElement.href || targetElement.getAttribute("href") || ""
          : targetElement.getAttribute("href") || "";

      sendAnalyticsEvent({
        eventType: "click",
        visitorId,
        visitId,
        sessionId: visitorId,
        locale: currentLocaleRef.current,
        pagePath: normalizePath(currentPathRef.current),
        clickLabel,
        clickHref: normalizeHref(maybeHref || ""),
        clickTag: normalizeText(targetElement.tagName.toLowerCase(), 24),
      });
      touchVisitContext();
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => {
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushPageDuration(true);
        currentPathStartedAtRef.current = Date.now();
        return;
      }
      if (document.visibilityState === "visible") {
        currentPathStartedAtRef.current = Date.now();
        touchVisitContext();
      }
    };

    const onPageHide = () => {
      flushPageDuration(true);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      flushPageDuration(true);
    };
  }, []);

  return null;
}
