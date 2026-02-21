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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const desktopOnly = window.matchMedia("(min-width: 993px)");
    if (!desktopOnly.matches) return;

    const closeTimers = new WeakMap<HTMLElement, number>();
    const menuParents = Array.from(
      document.querySelectorAll<HTMLElement>("#mainmenu > li.has-child"),
    );

    const clearCloseTimer = (item: HTMLElement) => {
      const timerId = closeTimers.get(item);
      if (timerId) {
        window.clearTimeout(timerId);
        closeTimers.delete(item);
      }
    };

    const onSubmenuItemClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      const link = target.closest<HTMLAnchorElement>("#mainmenu > li > ul:not(.mega) a.menu-item");
      if (!link) return;

      const topItem = link.closest<HTMLElement>("#mainmenu > li.has-child");
      if (!topItem) return;

      clearCloseTimer(topItem);
      topItem.classList.add("submenu-force-close");
      const timerId = window.setTimeout(() => {
        topItem.classList.remove("submenu-force-close");
        closeTimers.delete(topItem);
      }, 260);
      closeTimers.set(topItem, timerId);
    };

    const onMenuItemLeave = (event: Event) => {
      const item = event.currentTarget as HTMLElement;
      clearCloseTimer(item);
      item.classList.remove("submenu-force-close");
    };

    document.addEventListener("click", onSubmenuItemClick);
    menuParents.forEach((item) => item.addEventListener("mouseleave", onMenuItemLeave));

    return () => {
      document.removeEventListener("click", onSubmenuItemClick);
      menuParents.forEach((item) => {
        item.removeEventListener("mouseleave", onMenuItemLeave);
        clearCloseTimer(item);
        item.classList.remove("submenu-force-close");
      });
    };
  }, []);

  return null;
}
