import Link from "next/link";

import type { HomeResolvedContent } from "@/lib/homeContentApi";

type BookingPartnersSectionProps = {
  partners: HomeResolvedContent["hero"]["bookingPartners"];
  title?: string;
  description?: string;
};

export default function BookingPartnersSection({ partners, title, description }: BookingPartnersSectionProps) {
  if (!partners.length) return null;

  return (
    <section className="home-booking-partners-section">
      <div className="container-fluid">
        <div className="home-booking-partners-head">
          <h5 className="home-booking-partners-title">{title || "Booking Partners"}</h5>
          <p className="home-booking-partners-description">
            {description || "Reserve through our trusted platforms and partners."}
          </p>
        </div>
        <div className="home-booking-partners-list" aria-label="Booking partners">
          {partners.map((partner) => {
            const isExternal = /^https?:\/\//i.test(partner.url);
            return (
              <Link
                key={`${partner.name}-${partner.url}`}
                href={partner.url}
                className="home-booking-partner-card"
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                aria-label={partner.description ? `${partner.name} - ${partner.description}` : partner.name}
              >
                <img src={partner.logo} alt={partner.name} />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
