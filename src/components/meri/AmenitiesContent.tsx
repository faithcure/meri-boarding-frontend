"use client";

import { useEffect, useRef, useState } from "react";
import AmenityCard from "./AmenityCard";
import { getAmenityCards, getAmenityOverviewItems } from "./amenitiesData";
import { localePath } from "@/i18n/localePath";
import { useLocale } from "@/i18n/useLocale";
import { getMessages } from "@/i18n/messages";

export default function AmenitiesContent() {
  const locale = useLocale();
  const t = getMessages(locale).amenitiesContent;
  const cards = getAmenityCards(locale);
  const overviewItems = getAmenityOverviewItems(locale);
  const layouts = t.layoutOptions;
  const contactHref = localePath(locale, "/contact");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isSwitching, setIsSwitching] = useState(false);
  const switchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (switchTimerRef.current !== null) {
        window.clearTimeout(switchTimerRef.current);
      }
    };
  }, []);

  const handleViewChange = (nextView: "grid" | "list") => {
    if (nextView === view) return;
    if (switchTimerRef.current !== null) {
      window.clearTimeout(switchTimerRef.current);
    }
    setIsSwitching(true);
    setView(nextView);
    switchTimerRef.current = window.setTimeout(() => {
      setIsSwitching(false);
      switchTimerRef.current = null;
    }, 220);
  };

  return (
    <>
      <section>
        <div className="container">
          <div className="row g-4 mb-4 justify-content-center">
            <div className="col-lg-6 text-center">
              <div className="subtitle mb-0 id-color wow fadeInUp" data-wow-delay=".0s">
                {t.layoutSubtitle}
              </div>
              <h2 className="wow fadeInUp" data-wow-delay=".2s">
                {t.layoutTitle}
              </h2>
              <p className="cwow fadeInUp" data-wow-delay=".4s">
                {t.layoutDesc}
              </p>
            </div>
          </div>

          <div className="row g-4">
            {layouts.map((option) => (
              <div className="col-md-4" key={option.title}>
                <div className="p-30 bg-white rounded-1 h-100 shadow-soft">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="bg-color text-white rounded-circle d-inline-flex align-items-center justify-content-center w-40px h-40px">
                      <i className={option.icon} aria-hidden="true"></i>
                    </div>
                    <h3 className="mb-0">{option.title}</h3>
                  </div>
                  <p className="mb-3">{option.description}</p>
                  <ul className="ul-check mb-0">
                    {option.highlights.map((item) => (
                      <li className="mb-1" key={item}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="amenities-toolbar">
            <div className="subtitle mb-0 id-color wow fadeInUp" data-wow-delay=".0s">
              {t.amenitiesSubtitle}
            </div>
            <div className="amenities-toolbar-head">
              <h2 className="wow fadeInUp" data-wow-delay=".2s">
                {t.amenitiesTitle}
              </h2>
              <div className="amenities-view-toggle" role="group" aria-label={t.toggleLabel}>
                <button
                  type="button"
                  className={`amenities-toggle-btn ${view === "grid" ? "is-active" : ""}`}
                  aria-pressed={view === "grid"}
                  onClick={() => handleViewChange("grid")}
                >
                  <i className="fa fa-th-large me-2" aria-hidden="true"></i>
                  {t.cardView}
                </button>
                <button
                  type="button"
                  className={`amenities-toggle-btn ${view === "list" ? "is-active" : ""}`}
                  aria-pressed={view === "list"}
                  onClick={() => handleViewChange("list")}
                >
                  <i className="fa fa-list me-2" aria-hidden="true"></i>
                  {t.listView}
                </button>
              </div>
            </div>
            <p className="cwow fadeInUp" data-wow-delay=".4s">
              {t.switchHelp}
            </p>
          </div>

          <div
            className={`${view === "grid" ? "row g-4 mt-1" : "row g-0 mt-1"} amenities-list ${
              isSwitching ? "is-switching" : ""
            }`}
          >
            {cards.map((card) => (
              <div className={view === "grid" ? "col-md-6" : "col-12"} key={card.title}>
                <AmenityCard
                  card={card}
                  layout={view}
                  ctaLabel={t.request}
                  contactHref={contactHref}
                />
              </div>
            ))}
          </div>

          <div className="row mt-4">
            <div className="col-lg-12">
              <div className="p-4 bg-color-op-1 rounded-1">
                <h3 className="mb-3">{t.includedTitle}</h3>
                <ul className="ul-check cols-2 mb-0">
                  {overviewItems.map((item) => (
                    <li className="mb-2" key={item}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="row mt-4">
            <div className="col-lg-12 text-center">
              <a href={contactHref} className="btn-main fx-slide hover-white">
                <span>{t.request}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
