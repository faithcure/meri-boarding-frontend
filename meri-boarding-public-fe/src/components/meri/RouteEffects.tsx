"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    initHeroSwiper?: () => void;
    metaWorksReinit?: () => void;
    initDateRangePicker?: () => void;
    __meriLegacyScriptsReady?: boolean;
  }
}

export default function RouteEffects() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let hasRun = false;
    const runEffects = () => {
      if (hasRun) return;
      hasRun = true;
      if (typeof window.initHeroSwiper === "function") {
        window.initHeroSwiper();
      }
      if (typeof window.metaWorksReinit === "function") {
        window.metaWorksReinit();
      }
      if (typeof window.initDateRangePicker === "function") {
        window.initDateRangePicker();
      }
      window.dispatchEvent(new Event("meri:route-effects-run"));
    };

    const scheduleRun = () => window.requestAnimationFrame(() => runEffects());

    let rafId: number | null = null;
    const onLegacyReady = () => {
      rafId = scheduleRun();
    };

    if (window.__meriLegacyScriptsReady) {
      rafId = scheduleRun();
    } else {
      window.addEventListener("meri:legacy-ready", onLegacyReady, { once: true });
    }

    const fallbackTimer = window.setTimeout(() => {
      if (!hasRun) {
        rafId = scheduleRun();
      }
    }, 420);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("meri:legacy-ready", onLegacyReady);
    };
  }, [pathname]);

  return null;
}
