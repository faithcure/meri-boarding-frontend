import Link from "next/link";

import type { HomeResolvedContent } from "@/lib/homeContentApi";

type BookingPartnersSectionProps = {
  partners: HomeResolvedContent["hero"]["bookingPartners"];
};

export default function BookingPartnersSection({ partners }: BookingPartnersSectionProps) {
  if (!partners.length) return null;

  return (
    <section className="home-booking-partners-section">
      <div className="container-fluid">
        <div className="row">
          <div className="col-lg-10 offset-lg-1">
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
                    aria-label={partner.name}
                  >
                    <img src={partner.logo} alt={partner.name} />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
