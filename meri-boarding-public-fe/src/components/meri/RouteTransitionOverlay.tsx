"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const INITIAL_MIN_SHOW_MS = 420;
const INITIAL_SAFETY_TIMEOUT_MS = 2200;
const ROUTE_FALLBACK_MS = 1100;
const ROUTE_SETTLE_DELAY_MS = 220;

export default function RouteTransitionOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const isFirstPathRender = useRef(true);

  useEffect(() => {
    const startedAt = performance.now();
    let hideTimer: number | null = null;

    const hideWhenReady = () => {
      const elapsed = performance.now() - startedAt;
      const wait = Math.max(0, INITIAL_MIN_SHOW_MS - elapsed);
      hideTimer = window.setTimeout(() => setVisible(false), wait);
    };

    if (document.readyState === "complete") {
      hideWhenReady();
    } else {
      window.addEventListener("load", hideWhenReady, { once: true });
    }

    const safetyTimer = window.setTimeout(() => setVisible(false), INITIAL_SAFETY_TIMEOUT_MS);

    return () => {
      window.removeEventListener("load", hideWhenReady);
      window.clearTimeout(safetyTimer);
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
      }
    };
  }, []);

  useEffect(() => {
    if (isFirstPathRender.current) {
      isFirstPathRender.current = false;
      return;
    }

    let settled = false;
    let settleTimer: number | null = null;
    setVisible(true);

    const settle = () => {
      if (settled) return;
      settled = true;
      settleTimer = window.setTimeout(() => setVisible(false), ROUTE_SETTLE_DELAY_MS);
    };

    const onRouteEffectsRun = () => settle();
    window.addEventListener("meri:route-effects-run", onRouteEffectsRun, { once: true });

    const fallbackTimer = window.setTimeout(() => settle(), ROUTE_FALLBACK_MS);

    return () => {
      window.removeEventListener("meri:route-effects-run", onRouteEffectsRun);
      window.clearTimeout(fallbackTimer);
      if (settleTimer !== null) {
        window.clearTimeout(settleTimer);
      }
    };
  }, [pathname]);

  return (
    <div className={`meri-route-overlay ${visible ? "is-visible" : ""}`} aria-hidden="true">
      <div className="meri-route-overlay__core">
        <span className="meri-route-overlay__halo" />
        <span className="meri-route-overlay__ring" />
        <img
          src="/meri-logo-mark.svg"
          alt=""
          className="meri-route-overlay__mark"
          width={44}
          height={44}
        />
      </div>
    </div>
  );
}
