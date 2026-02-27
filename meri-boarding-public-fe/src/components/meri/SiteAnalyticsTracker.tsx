"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { withPublicApiBaseIfNeeded } from "@/lib/apiBaseUrl";

type AnalyticsLocale = "de" | "en" | "tr";
type AnalyticsEventType = "page_view" | "page_leave" | "click";

type AnalyticsPayload = {
  eventType: AnalyticsEventType;
  sessionId: string;
  locale: AnalyticsLocale;
  pagePath: string;
  pageTitle?: string;
  referrerPath?: string;
  durationMs?: number;
  clickLabel?: string;
  clickHref?: string;
  clickTag?: string;
};

const analyticsEndpoint = withPublicApiBaseIfNeeded("/api/v1/public/analytics/events");
const analyticsSessionStorageKey = "meri_analytics_session_id";

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

function getOrCreateAnalyticsSessionId() {
  if (typeof window === "undefined") return "";
  const existing = String(window.localStorage.getItem(analyticsSessionStorageKey) || "").trim();
  if (existing) return existing;
  const created =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(analyticsSessionStorageKey, created);
  return created;
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
  const sessionIdRef = useRef("");
  const currentPathRef = useRef("/");
  const currentLocaleRef = useRef<AnalyticsLocale>(normalizeLocale(locale || detectLocaleFromPath(pathname)));
  const currentPathStartedAtRef = useRef<number>(0);
  const previousPathRef = useRef("");

  const flushPageDuration = (useBeacon = false) => {
    const sessionId = sessionIdRef.current;
    const activePath = normalizePath(currentPathRef.current);
    const startedAt = currentPathStartedAtRef.current;
    if (!sessionId || !activePath || !startedAt) return;

    const durationMs = Math.max(0, Date.now() - startedAt);
    if (durationMs < 300) return;

    sendAnalyticsEvent(
      {
        eventType: "page_leave",
        sessionId,
        locale: currentLocaleRef.current,
        pagePath: activePath,
        durationMs,
      },
      useBeacon,
    );
  };

  useEffect(() => {
    sessionIdRef.current = getOrCreateAnalyticsSessionId();
    currentPathRef.current = normalizePath(pathname);
    currentLocaleRef.current = normalizeLocale(locale || detectLocaleFromPath(pathname));
    currentPathStartedAtRef.current = Date.now();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const nextPath = normalizePath(pathname);
    const nextLocale = normalizeLocale(locale || detectLocaleFromPath(nextPath));
    const sessionId = sessionIdRef.current || getOrCreateAnalyticsSessionId();
    if (!sessionId) return;

    const previousPath = currentPathRef.current;
    const isPathChange = previousPath && previousPath !== nextPath;

    if (isPathChange) {
      flushPageDuration(false);
      previousPathRef.current = previousPath;
    }

    sendAnalyticsEvent({
      eventType: "page_view",
      sessionId,
      locale: nextLocale,
      pagePath: nextPath,
      pageTitle: typeof document !== "undefined" ? normalizeText(document.title, 180) : "",
      referrerPath: normalizePath(previousPathRef.current || ""),
    });

    currentLocaleRef.current = nextLocale;
    currentPathRef.current = nextPath;
    currentPathStartedAtRef.current = Date.now();
  }, [locale, pathname]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const targetElement = (event.target as Element | null)?.closest(
        "a,button,[role='button'],input[type='submit'],input[type='button']",
      ) as HTMLElement | null;
      if (!targetElement) return;

      const sessionId = sessionIdRef.current;
      if (!sessionId) return;

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
        sessionId,
        locale: currentLocaleRef.current,
        pagePath: normalizePath(currentPathRef.current),
        clickLabel,
        clickHref: normalizeHref(maybeHref || ""),
        clickTag: normalizeText(targetElement.tagName.toLowerCase(), 24),
      });
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
