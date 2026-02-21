import LocaleSwitcher from "@/components/meri/LocaleSwitcher";
import MainMenuActive from "@/components/meri/MainMenuActive";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { getServerApiBaseUrl } from "@/lib/apiBaseUrl";
import { fetchPublicHotels } from "@/lib/hotelsApi";
import Link from "next/link";

type HeaderProps = {
  locale?: Locale;
};

export default async function Header({ locale: localeProp }: HeaderProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const apiBaseUrl = getServerApiBaseUrl();
  let remoteHeaderContent: Record<string, unknown> = {};
  try {
    const tResponse = await fetch(`${apiBaseUrl}/api/v1/public/content/header?locale=${locale}`, {
      next: { revalidate: 60 },
    });
    if (!tResponse.ok) {
      throw new Error(`Failed to fetch header content (${tResponse.status})`);
    }
    const tData = await tResponse.json();
    remoteHeaderContent = (tData?.content || {}) as Record<string, unknown>;
  } catch (error) {
    console.error("[public-fe] falling back to local header labels", error);
  }

  const t = {
    home: "",
    hotels: "",
    services: "",
    ourServices: "",
    ourAmenities: "",
    contact: "",
    reservation: "",
    ...remoteHeaderContent,
  };

  const hotels = await fetchPublicHotels(locale);
  const hotelLinks: Array<{ slug: string; menuName: string; available: boolean }> = hotels.map((item) => ({
    slug: item.slug,
    menuName: item.slug,
    available: item.available !== false
  }));
  const fullLabel = locale === "de" ? "Voll" : locale === "tr" ? "Dolu" : "Full";

  const withLocale = (path: string) => localePath(locale, path);
  return (
    <header className="header-light transparent">
      <MainMenuActive />
      <div className="container">
        <div className="row">
          <div className="col-md-12">
            <div className="de-flex">
              <div className="de-flex-col">
                <div id="logo">
                  <Link href={withLocale("/")}>
                    <img className="logo-main" src="/images/meri/meri-logo-black.png" alt="Meri Boarding Group" />
                    <img className="logo-scroll" src="/images/meri/meri-logo-black.png" alt="Meri Boarding Group" />
                    <img className="logo-mobile" src="/images/meri/meri-logo-black.png" alt="Meri Boarding Group" />
                  </Link>
                </div>
              </div>

              <div className="de-flex-col">
                <div className="de-flex-col header-col-mid">
                  <ul id="mainmenu">
                    <LocaleSwitcher variant="menu" />
                    <li>
                      <Link className="menu-item" href={withLocale("/")}>
                        {t.home}
                      </Link>
                    </li>
                    <li className="has-child">
                      <Link className="menu-item" href={withLocale("/hotels")}>
                        {t.hotels}
                      </Link>
                      <ul>
                        {hotelLinks.map((hotel) => (
                          <li key={hotel.slug}>
                            <Link
                              className={`menu-item${hotel.available ? "" : " hotel-menu-item-full"}`}
                              href={withLocale(`/hotels/${hotel.slug}`)}
                              data-full-label={hotel.available ? undefined : fullLabel}
                            >
                              {hotel.menuName}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                    <li className="has-child">
                      <Link className="menu-item" href={withLocale("/services")}>
                        {t.services}
                      </Link>
                      <ul>
                        <li>
                          <Link className="menu-item" href={withLocale("/services")}>
                            {t.ourServices}
                          </Link>
                        </li>
                        <li>
                          <Link className="menu-item" href={withLocale("/amenities")}>
                            {t.ourAmenities}
                          </Link>
                        </li>
                      </ul>
                    </li>
                    <li>
                      <Link className="menu-item" href={withLocale("/contact")}>
                        {t.contact}
                      </Link>
                    </li>
                    <li className="mobile-menu-socials">
                      <a className="mobile-menu-social" href="https://www.instagram.com/" aria-label="Instagram" target="_blank" rel="noreferrer">
                        <i className="fa-brands fa-instagram" aria-hidden="true"></i>
                      </a>
                      <a className="mobile-menu-social" href="https://www.linkedin.com/" aria-label="LinkedIn" target="_blank" rel="noreferrer">
                        <i className="fa-brands fa-linkedin-in" aria-hidden="true"></i>
                      </a>
                      <a className="mobile-menu-social" href="#" aria-label="Facebook">
                        <i className="fa-brands fa-facebook-f" aria-hidden="true"></i>
                      </a>
                      <a className="mobile-menu-social" href="#" aria-label="YouTube">
                        <i className="fa-brands fa-youtube" aria-hidden="true"></i>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="de-flex-col">
                <div className="menu_side_area">
                  <LocaleSwitcher variant="header" />
                  <Link
                    href={withLocale("/reservation")}
                    className="btn-main fx-slide btn-cta-pulse btn-cta-solid"
                    data-hover={t.reservation}
                  >
                    <span>
                      {t.reservation} <i className="fa fa-arrow-right ms-2" aria-hidden="true"></i>
                    </span>
                  </Link>
                  <span id="menu-btn" role="button" aria-label="Toggle menu" aria-controls="mainmenu" aria-expanded="false">
                    <span className="menu-btn-bar menu-btn-bar--top" aria-hidden="true"></span>
                    <span className="menu-btn-bar menu-btn-bar--middle" aria-hidden="true"></span>
                    <span className="menu-btn-bar menu-btn-bar--bottom" aria-hidden="true"></span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
