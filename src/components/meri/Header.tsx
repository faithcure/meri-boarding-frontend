import LocaleSwitcher from "@/components/meri/LocaleSwitcher";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { getMessages } from "@/i18n/messages";
import Link from "next/link";

type HeaderProps = {
  locale?: Locale;
};

export default async function Header({ locale: localeProp }: HeaderProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const t = getMessages(locale).header;
  const withLocale = (path: string) => localePath(locale, path);
  return (
    <header className="header-light transparent">
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
                    <li>
                      <Link className="menu-item" href={withLocale("/hotels")}>
                        {t.hotels}
                      </Link>
                      <ul>
                        <li>
                          <Link className="menu-item" href={withLocale("/hotels/flamingo")}>
                            {t.flamingo}
                          </Link>
                        </li>
                        <li>
                          <Link className="menu-item" href={withLocale("/hotels/europaplatz")}>
                            {t.europaplatz}
                          </Link>
                        </li>
                        <li>
                          <Link className="menu-item new" href={withLocale("/hotels/hildesheim")}>
                            {t.hildesheim}
                          </Link>
                        </li>
                      </ul>
                    </li>
                    <li>
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
