import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { getMessages } from "@/i18n/messages";
import { localePath } from "@/i18n/localePath";
import Link from "next/link";

const boardingOptions = ["Flamingo", "Europaplatz", "Hildesheim"];

type BookingInquiryFormProps = {
  locale?: Locale;
};

export default async function BookingInquiryForm({ locale: localeProp }: BookingInquiryFormProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const t = getMessages(locale).bookingInquiryForm;
  const withLocale = (path: string) => localePath(locale, path);
  const purposes = t.stayPurposes;
  return (
    <section className="relative mt-80">
      <div className="container">
        <div className="row justify-content-center mb-4">
          <div className="col-lg-8 text-center">
            <div className="subtitle id-color wow fadeInUp">{t.subtitle}</div>
            <h2 className="wow fadeInUp" data-wow-delay=".2s">
              {t.title}
            </h2>
          </div>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="bg-color-op-1 rounded-1 p-40 relative">
              <form
                name="bookingInquiryForm"
                id="booking_inquiry_form"
                method="post"
                action="https://meri-boarding.de/boarding-booking.php"
              >
                <div className="row g-4">
                  <div className="col-md-6">
                    <h3 className="fs-18">{t.firstName}</h3>
                    <input
                      type="text"
                      name="vorname"
                      className="bg-white form-control"
                      placeholder={t.firstName}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <h3 className="fs-18">{t.lastName}</h3>
                    <input
                      type="text"
                      name="nachname"
                      className="bg-white form-control"
                      placeholder={t.lastName}
                      required
                    />
                  </div>

                  <div className="col-md-12">
                    <h3 className="fs-18">{t.company}</h3>
                    <input
                      type="text"
                      name="firma"
                      className="bg-white form-control"
                      placeholder={t.company}
                    />
                  </div>

                  <div className="col-md-6">
                    <h3 className="fs-18">{t.email}</h3>
                    <input
                      type="email"
                      name="email"
                      className="bg-white form-control"
                      placeholder={t.email}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <h3 className="fs-18">{t.phone}</h3>
                    <input
                      type="text"
                      name="telefon"
                      className="bg-white form-control"
                      placeholder={t.phone}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <h3 className="fs-18">{t.purpose}</h3>
                    <select name="zweck" className="bg-white form-control" required>
                      <option value="">{t.select}</option>
                      {purposes.map((purpose) => (
                        <option key={purpose.value} value={purpose.value}>
                          {purpose.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <h3 className="fs-18">{t.nationality}</h3>
                    <input
                      type="text"
                      name="nationalitat"
                      className="bg-white form-control"
                      placeholder={t.nationality}
                    />
                  </div>

                  <div className="col-md-6">
                    <h3 className="fs-18">{t.guests}</h3>
                    <input
                      type="number"
                      min="1"
                      name="anzahl_personen"
                      className="bg-white form-control"
                      placeholder={t.guests}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <h3 className="fs-18">{t.rooms}</h3>
                    <select name="anzahl_zimmer" className="bg-white form-control" required>
                      <option value="">{t.select}</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <h3 className="fs-18">{t.boarding}</h3>
                    <select name="boardinghaus" className="bg-white form-control" required>
                      <option value="">{t.select}</option>
                      {boardingOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <h3 className="fs-18">{t.moveIn}</h3>
                    <input
                      type="text"
                      name="date"
                      className="bg-white form-control"
                      placeholder="mm/dd/yyyy"
                    />
                  </div>

                  <div className="col-md-12">
                    <h3 className="fs-18">{t.message}</h3>
                    <textarea
                      name="nachricht"
                      className="bg-white form-control h-100px"
                      placeholder={t.message}
                    ></textarea>
                  </div>

                  <div className="col-md-12">
                    <label className="policy-check">
                      <input type="checkbox" name="datenschutz" required />
                      <span>
                        {t.policy}
                        <Link href={withLocale("/privacy")}>{t.policyLink}</Link>.
                      </span>
                    </label>
                  </div>

                  <div className="col-md-12">
                    <div id="submit_inquiry">
                      <input type="submit" value={t.send} className="btn-main" />
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
