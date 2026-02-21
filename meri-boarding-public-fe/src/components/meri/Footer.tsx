import LocaleSwitcher from "@/components/meri/LocaleSwitcher";
import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { localePath } from "@/i18n/localePath";
import { getMessages } from "@/i18n/messages";
import { fetchGeneralSocialLinks } from "@/lib/siteSettingsApi";
import Link from "next/link";
import styles from "./Footer.module.css";

type FooterProps = {
  locale?: Locale;
};

export default async function Footer({ locale: localeProp }: FooterProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const t = getMessages(locale).footer;
  const socialLinks = await fetchGeneralSocialLinks();
  const withLocale = (path: string) => localePath(locale, path);
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <span className={styles.label}>{t.company}</span>
            <img src="/meri-logo-white.svg" alt="Meri Boarding Group" />
            <div className={styles.text}>
              {t.addressLine1}
              <br />
              {t.addressLine2}
            </div>
            <div className={styles.socials}>
              {socialLinks.map((item) => (
                <a key={item.id} href={item.url} aria-label={item.label} target="_blank" rel="noreferrer">
                  <i className={item.iconClass} aria-hidden="true"></i>
                </a>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.heading}>{t.contactTitle}</div>
            <div className={`${styles.list} ${styles.noWrap}`}>
              <div>{t.phone}</div>
              <div>{t.whatsapp}</div>
              <div>{t.email}</div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.heading}>{t.officeTitle}</div>
            <div className={styles.list}>
              <div>{t.officeDay}</div>
              <div>{t.officeMorning}</div>
              <div>{t.officeAfternoon}</div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.heading}>{t.linksTitle}</div>
            <div className={`${styles.list} ${styles.links}`}>
              <Link href={withLocale("/contact")}>{t.linkContact}</Link>
              <Link href={withLocale("/privacy")}>{t.linkPrivacy}</Link>
              <Link href={withLocale("/agb")}>{t.linkTerms}</Link>
              <Link href={withLocale("/impressum")}>{t.linkImprint}</Link>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.subfooter}>
        <div className={styles.subfooterInner}>
          <span>{t.copyright}</span>
          <span>{t.tagline}</span>
          <div className={styles.langSwitch}>
            <span className={styles.langLabel}>{t.language}</span>
            <LocaleSwitcher variant="footer" />
          </div>
        </div>
      </div>
    </footer>
  );
}
