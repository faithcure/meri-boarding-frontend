"use client";

import { useEffect, useMemo, useState } from "react";
import type { HomeResolvedContent } from "@/lib/homeContentApi";

type TestimonialsProps = {
  content?: HomeResolvedContent["testimonials"];
};

export default function Testimonials({ content }: TestimonialsProps = {}) {
  const slides = useMemo(
    () =>
      (content?.slides || [])
        .map((slide) => ({
          badge: String(slide.badge || "").trim(),
          text: String(slide.text || "").trim(),
        }))
        .filter((slide) => Boolean(slide.badge) && Boolean(slide.text)),
    [content?.slides],
  );

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    setActiveSlideIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveSlideIndex((current) => (current + 1) % slides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const activeSlide = slides[activeSlideIndex] || { badge: "", text: "" };

  return (
    <section className="text-light jarallax mx-2 rounded-1 overflow-hidden">
      {content?.backgroundImage ? (
        <img
          src={content.backgroundImage}
          className="jarallax-img"
          alt=""
          loading="lazy"
          fetchPriority="low"
          decoding="async"
        />
      ) : null}
      <div className="sw-overlay op-6"></div>
      <div className="container relative z-2">
        <div className="row g-4 gx-5 align-items-center">
          <div className="col-lg-5 text-center">
            <h2 className="fs-96 mb-0">{content?.apartmentsCount ?? 0}</h2>
            <span className="d-block id-color">{content?.apartments || ""}</span>
            {content?.locations || ""}
          </div>
          <div className="col-lg-7">
            {slides.length > 0 ? (
              <div className="testimonial-slider">
                <div className="testimonial-slide is-active" key={`${activeSlide.badge}-${activeSlideIndex}`}>
                  <span
                    className="d-inline-flex align-items-center mb-3"
                    style={{
                      background: "var(--primary-color)",
                      color: "#fff",
                      border: "1px solid color-mix(in srgb, var(--primary-color) 85%, #fff)",
                      borderRadius: 0,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: 0.2,
                      textTransform: "uppercase",
                    }}
                  >
                    {activeSlide.badge}
                  </span>
                  <h3 className="mb-4 fs-40">{activeSlide.text}</h3>
                  <span>Meri Boarding Group</span>
                </div>
                {slides.length > 1 ? (
                  <div className="testimonial-dots" role="tablist" aria-label="Testimonials">
                    {slides.map((slide, index) => (
                      <button
                        key={`${slide.badge}-${index}`}
                        type="button"
                        className={`testimonial-dot ${index === activeSlideIndex ? "is-active" : ""}`}
                        onClick={() => setActiveSlideIndex(index)}
                        aria-label={`Slide ${index + 1}`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
