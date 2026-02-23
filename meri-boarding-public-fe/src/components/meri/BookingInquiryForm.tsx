import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { getMessages } from "@/i18n/messages";
import { localePath } from "@/i18n/localePath";
import type { ReservationResolvedContent } from "@/lib/reservationContentApi";
import { fetchReservationResolvedContent } from "@/lib/reservationContentApi";
import { fetchGeneralSettings } from "@/lib/siteSettingsApi";
import BookingInquiryFormClient from "@/components/meri/BookingInquiryFormClient";

type BookingInquiryFormProps = {
  locale?: Locale;
  content?: ReservationResolvedContent["inquiry"];
};

export default async function BookingInquiryForm({ locale: localeProp, content }: BookingInquiryFormProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const fallback = getMessages(locale).bookingInquiryForm;
  const [resolvedInquiryContent, generalSettings] = await Promise.all([
    content ? Promise.resolve({ inquiry: content }) : fetchReservationResolvedContent(locale),
    fetchGeneralSettings()
  ]);
  const sharedInquiryContent = resolvedInquiryContent.inquiry;
  const privacyHref = localePath(locale, "/privacy");
  const actionFromGeneralSettings = String(generalSettings.formDelivery.requestFormActionUrl || "").trim();

  const copy = {
    action: actionFromGeneralSettings || String(sharedInquiryContent?.action || "https://meri-boarding.de/boarding-booking.php"),
    subtitle: String(sharedInquiryContent?.subtitle || fallback.subtitle || ""),
    title: String(sharedInquiryContent?.title || fallback.title || ""),
    firstName: String(sharedInquiryContent?.firstName || fallback.firstName || ""),
    lastName: String(sharedInquiryContent?.lastName || fallback.lastName || ""),
    company: String(sharedInquiryContent?.company || fallback.company || ""),
    email: String(sharedInquiryContent?.email || fallback.email || ""),
    phone: String(sharedInquiryContent?.phone || fallback.phone || ""),
    purpose: String(sharedInquiryContent?.purpose || fallback.purpose || ""),
    nationality: String(sharedInquiryContent?.nationality || fallback.nationality || ""),
    guests: String(sharedInquiryContent?.guests || fallback.guests || ""),
    rooms: String(sharedInquiryContent?.rooms || fallback.rooms || ""),
    boarding: String(sharedInquiryContent?.boarding || fallback.boarding || ""),
    moveIn: String(sharedInquiryContent?.moveIn || fallback.moveIn || ""),
    message: String(sharedInquiryContent?.message || fallback.message || ""),
    select: String(sharedInquiryContent?.select || fallback.select || ""),
    send: String(sharedInquiryContent?.send || fallback.send || ""),
    policy: String(sharedInquiryContent?.policy || fallback.policy || ""),
    policyLink: String(sharedInquiryContent?.policyLink || fallback.policyLink || ""),
    moveInPlaceholder: String(sharedInquiryContent?.moveInPlaceholder || "mm/dd/yyyy"),
    stayPurposes: Array.isArray(sharedInquiryContent?.stayPurposes) ? sharedInquiryContent.stayPurposes : fallback.stayPurposes,
    boardingOptions: Array.isArray(sharedInquiryContent?.boardingOptions) ? sharedInquiryContent.boardingOptions : ["Flamingo", "Europaplatz", "Hildesheim"],
    roomOptions: Array.isArray(sharedInquiryContent?.roomOptions) ? sharedInquiryContent.roomOptions : ["1", "2", "3"],
  };

  return <BookingInquiryFormClient locale={locale} privacyHref={privacyHref} copy={copy} />;
}
