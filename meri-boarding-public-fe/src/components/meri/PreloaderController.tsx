"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const LOADER_ID = "de-loader";
const HIDE_DELAY_MS = 350;
const SAFETY_TIMEOUT_MS = 4000;

function getLoader() {
  return typeof document === "undefined"
    ? null
    : document.getElementById(LOADER_ID);
}

function hideLoader() {
  const loader = getLoader();
  if (!loader) return;
  loader.style.transition = "opacity 300ms ease";
  loader.style.opacity = "0";
  loader.style.pointerEvents = "none";
  window.setTimeout(() => {
    const current = getLoader();
    if (current) current.style.display = "none";
  }, HIDE_DELAY_MS);
}

export default function PreloaderController() {
  const pathname = usePathname();

  useEffect(() => {
    const onLoad = () => hideLoader();
    if (document.readyState === "complete") {
      hideLoader();
    } else {
      window.addEventListener("load", onLoad);
    }
    const safetyTimeout = window.setTimeout(() => hideLoader(), SAFETY_TIMEOUT_MS);

    return () => {
      window.removeEventListener("load", onLoad);
      window.clearTimeout(safetyTimeout);
    };
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => hideLoader(), 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
}
