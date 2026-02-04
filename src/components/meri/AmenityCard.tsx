import type { AmenityCard as AmenityCardType } from "./amenitiesData";
import Link from "next/link";

type AmenityCardProps = {
  card: AmenityCardType;
  layout?: "grid" | "list";
  ctaLabel?: string;
  contactHref?: string;
};

export default function AmenityCard({ card, layout = "grid", ctaLabel, contactHref }: AmenityCardProps) {
  const layoutClass = "amenity-card";

  if (layout === "list") {
    return (
      <div className="room-item hover p-2 rounded-1 bg-white mb-4">
        <div className="row g-5 align-items-center">
          <div className="col-md-4">
            <div className="d-block hover relative">
              <div className="rounded-1 overflow-hidden amenity-card-media">
                <img src={card.image} className="w-100 hover-scale-1-2" alt={card.title} />
              </div>
            </div>
          </div>
          <div className="col-md-8">
            <div className="p-4">
              <div className="row justify-content-between">
                <div className="col-md-7">
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <div className="bg-color text-white rounded-circle d-inline-flex align-items-center justify-content-center w-40px h-40px">
                      <i className={card.icon} aria-hidden="true"></i>
                    </div>
                    <h3 className="m-0">{card.title}</h3>
                  </div>
                  <p className="pb-0 mb-0 amenity-list-description">{card.description}</p>
                </div>
                <div className="col-md-5">
                  <div className="fs-15">
                    <ul className="ul-check amenity-list mb-3">
                      {card.highlights.map((item) => (
                        <li className="mb-1" key={item}>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className="spacer-single"></div>
                    {ctaLabel ? (
                      <Link href={contactHref ?? "/contact"} className="btn-main fx-slide hover-white">
                        <span>{ctaLabel}</span>
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`d-block h-100 hover relative ${layoutClass}`}>
      <div className="rounded-1 overflow-hidden relative amenity-card-media">
        <img src={card.image} className="w-100 hover-scale-1-2" alt={card.title} />
      </div>
      <div className="pt-4 amenity-card-body">
        <div className="d-flex align-items-center gap-3 mb-3">
          <div className="bg-color text-white rounded-circle d-inline-flex align-items-center justify-content-center w-40px h-40px">
            <i className={card.icon} aria-hidden="true"></i>
          </div>
          <h3 className="mb-0">{card.title}</h3>
        </div>
        <div className="p-3 bg-color-op-1 rounded-1 border">
          <p className="mb-0">{card.description}</p>
        </div>
        <ul className="ul-check mt-3 mb-0">
          {card.highlights.map((item) => (
            <li className="mb-1" key={item}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
