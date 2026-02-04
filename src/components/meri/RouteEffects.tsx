"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    initHeroSwiper?: () => void;
    metaWorksReinit?: () => void;
    initDateRangePicker?: () => void;
  }
}

export default function RouteEffects() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof window.initHeroSwiper === "function") {
      window.initHeroSwiper();
    }
    if (typeof window.metaWorksReinit === "function") {
      window.metaWorksReinit();
    }
    if (typeof window.initDateRangePicker === "function") {
      window.initDateRangePicker();
    }
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("scroll"));
  }, [pathname]);

  return null;
}
