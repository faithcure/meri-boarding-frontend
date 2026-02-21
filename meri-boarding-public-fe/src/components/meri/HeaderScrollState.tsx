"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const HEADER_SELECTOR = "header.header-light.transparent:not(.header-mobile)";
const CONDENSE_ENTER_THRESHOLD = 16;
const CONDENSE_EXIT_THRESHOLD = 0;

function updateHeaderScrollState(previousState: boolean) {
  const header = document.querySelector<HTMLElement>(HEADER_SELECTOR);
  if (!header) return previousState;
  const scrollY = window.scrollY || window.pageYOffset || 0;
  let isCondensed = previousState;

  if (!previousState && scrollY > CONDENSE_ENTER_THRESHOLD) {
    isCondensed = true;
  } else if (previousState && scrollY <= CONDENSE_EXIT_THRESHOLD) {
    isCondensed = false;
  }

  // Legacy script can still toggle these; keep them neutral for stable motion.
  header.classList.remove("scroll-down", "nav-up");
  header.classList.toggle("is-condensed", isCondensed);
  return isCondensed;
}

export default function HeaderScrollState() {
  const pathname = usePathname();

  useEffect(() => {
    let rafId = 0;
    let isCondensed = false;

    const schedule = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        isCondensed = updateHeaderScrollState(isCondensed);
      });
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => updateHeaderScrollState(window.scrollY > CONDENSE_ENTER_THRESHOLD));
    return () => window.cancelAnimationFrame(rafId);
  }, [pathname]);

  return null;
}
