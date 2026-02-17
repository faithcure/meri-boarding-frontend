import LocaleSwitcher from "@/components/meri/LocaleSwitcher";
import MainMenuActive from "@/components/meri/MainMenuActive";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { fetchPublicHotels } from "@/lib/hotelsApi";
import Link from "next/link";

type HeaderProps = {
  locale?: Locale;
};

export default async function Header({ locale: localeProp }: HeaderProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "http://localhost:4000";
  let t = {
    home: "",
    hotels: "",
    services: "",
    ourServices: "",
    ourAmenities: "",
    contact: "",
    reservation: "",
  };
  let hotelLinks: Array<{ slug: string; menuName: string; available: boolean }> = [];
  const fullLabel = locale === "de" ? "Voll" : locale === "tr" ? "Dolu" : "Full";

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/public/content/header?locale=${locale}`, {
      next: { revalidate: 60 },
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.content) {
        t = { ...t, ...data.content };
      }
    }
  } catch {}

  try {
    const hotels = await fetchPublicHotels(locale);
    hotelLinks = hotels.map((item) => ({
      slug: item.slug,
      menuName: item.slug,
      available: item.available !== false
    }));
  } catch {
    hotelLinks = [];
  }

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
                  </ul>
                </div>
              </div>

              <div className="de-flex-col">
                <div className="menu_side_area">
                  <LocaleSwitcher variant="header" />
                  <Link href={withLocale("/reservation")} className="btn-main btn-slide-duo hover-white">
                    <span className="btn-slide-front">
                      <i className="fa fa-heart" aria-hidden="true"></i>
                      {t.reservation}
                    </span>
                    <span className="btn-slide-back" aria-hidden="true">
                      <i className="fa fa-heart" aria-hidden="true"></i>
                      {t.reservation}
                    </span>
                  </Link>
                  <span id="menu-btn"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
