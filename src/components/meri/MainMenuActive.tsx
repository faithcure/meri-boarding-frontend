"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function normalizePath(path: string) {
  if (!path) return "/";
  const clean = path.replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
}

const localeRoots = new Set(["/de", "/en", "/tr", "/"]);

function isRootLike(path: string) {
  return localeRoots.has(path);
}

function isMatch(current: string, linkPath: string) {
  if (isRootLike(linkPath)) {
    return current === linkPath;
  }
  if (current === linkPath) return true;
  return current.startsWith(`${linkPath}/`);
}

export default function MainMenuActive() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentPath = normalizePath(pathname || window.location.pathname);
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("#mainmenu a.menu-item"));

    links.forEach((link) => link.classList.remove("active"));

    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let linkPath = "";
      try {
        linkPath = normalizePath(new URL(href, window.location.origin).pathname);
      } catch {
        return;
      }
      if (isMatch(currentPath, linkPath)) {
        link.classList.add("active");
      }
    });
  }, [pathname]);

  return null;
}
