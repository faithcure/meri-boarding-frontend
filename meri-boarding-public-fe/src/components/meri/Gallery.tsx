"use client";

import { useEffect, useRef, useState } from "react";
import type { HomeResolvedContent } from "@/lib/homeContentApi";

type GalleryProps = {
  content?: HomeResolvedContent["gallery"];
};

export default function Gallery({ content }: GalleryProps = {}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [hoveredImageKey, setHoveredImageKey] = useState<string | null>(null);
  const t = {
    subtitle: content?.subtitle || "",
    title: content?.title || "",
    description: content?.description || "",
    view: content?.view || "",
    categories: content?.categories || [],
    items: content?.items || []
  };
  const parallaxImage = t.items[0]?.image || "/images/background/1.webp";

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let rafId = 0;
    const applyParallax = () => {
      const rect = section.getBoundingClientRect();
      const viewportCenter = window.innerHeight * 0.5;
      const sectionCenter = rect.top + rect.height * 0.5;
      const offset = (viewportCenter - sectionCenter) * 0.22;
      section.style.setProperty("--gallery-parallax-offset", `${offset.toFixed(2)}px`);
      rafId = 0;
    };

    const onScrollOrResize = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(applyParallax);
    };

    applyParallax();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  return (
    <section ref={sectionRef} className="bg-color-op-1 rounded-1 mx-2 gallery-parallax-section">
      <div className="gallery-parallax-bg" style={{ backgroundImage: `url(${parallaxImage})` }} aria-hidden="true"></div>
      <div className="gallery-parallax-veil" aria-hidden="true"></div>

      <div className="container position-relative">
        <div className="row g-4 gx-5 align-items-center justify-content-between">
          <div className="col-lg-6">
            <div className="subtitle wow fadeInUp" data-wow-delay=".0s">{t.subtitle}</div>
            <h2 className="wow fadeInUp" data-wow-delay=".2s">{t.title}</h2>
          </div>
          <div className="col-lg-6">
            <p className="wow fadeInUp" data-wow-delay=".4s">{t.description}</p>
          </div>
        </div>

        <div className="spacer-single"></div>

        <div className="row">
          <div className="col-md-12 text-center">
            <ul id="filters" className="wow fadeInUp" data-wow-delay="0s">
              {t.categories.map((category, index) => (
                <li key={category.key}>
                  <a href="#" data-filter={`.${category.key}`} className={index === 0 ? "selected" : ""}>{category.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div id="gallery" className="row g-3 wow fadeIn" data-wow-delay=".3s">
          {t.items.map((item, index) => (
            <div className={`col-md-3 col-sm-6 col-12 item ${item.category}`} key={`${item.image}-${index}`} data-gallery-item="1">
              <a
                href={item.image}
                className="image-popup d-block hover w-100 text-start gallery-item-animated"
                onMouseEnter={() => setHoveredImageKey(`${item.image}-${index}`)}
                onMouseLeave={() => setHoveredImageKey(null)}
              >
                <div
                  className="relative overflow-hidden rounded-1 media-frame"
                  style={{
                    border: hoveredImageKey === `${item.image}-${index}` ? "2px solid var(--primary-color)" : "none",
                    boxShadow:
                      hoveredImageKey === `${item.image}-${index}`
                        ? "0 2px 6px rgba(0,0,0,0.16), 0 18px 28px -14px rgba(0,0,0,0.34), 0 36px 40px -30px rgba(0,0,0,0.42)"
                        : "0 2px 4px rgba(0,0,0,0.12), 0 14px 22px -14px rgba(0,0,0,0.28), 0 28px 30px -28px rgba(0,0,0,0.36)"
                  }}
                >
                  <div className="absolute start-0 w-100 hover-op-1 p-5 abs-middle z-3 text-center text-white">
                    <span
                      className="d-inline-flex align-items-center justify-content-center"
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        border: hoveredImageKey === `${item.image}-${index}` ? "3px solid var(--primary-color)" : "none",
                        background: "rgba(0,0,0,0.22)",
                        boxShadow:
                          hoveredImageKey === `${item.image}-${index}`
                            ? "0 0 18px color-mix(in srgb, var(--primary-color) 70%, transparent)"
                            : "none"
                      }}
                    >
                      <i className="fa fa-search" aria-hidden="true" style={{ fontSize: 18, color: "var(--primary-color)" }} />
                    </span>
                  </div>
                  <div className="absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2"></div>
                  <img src={item.image} className="w-100 hover-scale-1-2" alt={item.alt || ""} />
                </div>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
