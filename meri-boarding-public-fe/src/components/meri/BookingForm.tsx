import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { getMessages } from "@/i18n/messages";

type BookingFormProps = {
  locale?: Locale;
};

export default async function BookingForm({ locale: localeProp }: BookingFormProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const t = getMessages(locale).bookingForm;
  return (
    <section aria-label="section">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="bg-white p-40 rounded-1">
              <form name="contactForm" id="contact_form" method="post" action="#">
                <div className="row g-4 align-items-end">
                  <div className="col-md-1-5">
                    <div className="fs-18 text-dark fw-500 mb-10">{t.checkIn}</div>
                    <input type="text" id="checkin" className="form-control" required />
                  </div>

                  <div className="col-md-1-5">
                    <div className="fs-18 text-dark fw-500 mb-10">{t.checkOut}</div>
                    <input type="text" id="checkout" className="form-control" required />
                  </div>

                  <div className="col-md-1-5">
                    <div className="fs-18 text-dark fw-500 mb-10">{t.rooms}</div>
                    <select name="rooms" id="rooms" className="form-control">
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                      <option value="9">9</option>
                      <option value="10">10</option>
                    </select>
                  </div>

                  <div className="col-md-1-5">
                    <div className="fs-18 text-dark fw-500 mb-10">{t.guests}</div>
                    <select name="guests" id="guests" className="form-control">
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                      <option value="9">9</option>
                      <option value="10">10</option>
                    </select>
                  </div>

                  <div className="col-md-1-5">
                    <div id="submit">
                      <input
                        type="submit"
                        id="send_message"
                        value={t.availability}
                        className="btn-main w-100"
                      />
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
