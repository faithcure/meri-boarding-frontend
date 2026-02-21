import type { Locale } from "@/i18n/getLocale";
import { getMessages } from "@/i18n/messages";
import { getServerApiBaseUrl, withPublicApiBaseIfNeeded } from "@/lib/apiBaseUrl";

type CmsContactContent = {
  hero?: {
    subtitle?: string;
    title?: string;
    home?: string;
    crumb?: string;
    backgroundImage?: string;
  };
  details?: {
    subtitle?: string;
    title?: string;
    description?: string;
    items?: Array<{ icon?: string; title?: string; value?: string }>;
    socials?: Array<{ icon?: string; label?: string; url?: string }>;
  };
  form?: {
    action?: string;
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    send?: string;
    success?: string;
    error?: string;
    namePlaceholder?: string;
    emailPlaceholder?: string;
    phonePlaceholder?: string;
    messagePlaceholder?: string;
  };
};

export type ContactResolvedContent = {
  hero: ReturnType<typeof getMessages>["contactHero"] & { backgroundImage: string };
  details: ReturnType<typeof getMessages>["contactDetails"] & {
    items: Array<{ icon: string; title: string; value: string }>;
    socials: Array<{ icon: string; label: string; url: string }>;
  };
  form: ReturnType<typeof getMessages>["contactForm"] & {
    action: string;
  };
};

const apiBaseUrl = getServerApiBaseUrl();

function withApiBaseIfNeeded(url: string) {
  return withPublicApiBaseIfNeeded(url);
}

function resolveContent(locale: Locale, cms?: CmsContactContent): ContactResolvedContent {
  const messages = getMessages(locale);
  const fallbackDetailsItems = [
    { icon: "icofont-location-pin", title: messages.contactDetails.address, value: "Flamingoweg 70\nD-70378 Stuttgart" },
    { icon: "icofont-envelope", title: messages.contactDetails.email, value: "info@meri-boarding.de" },
    { icon: "icofont-phone", title: messages.contactDetails.phone, value: "+49 (0) 711 54 89 84 - 0" },
    { icon: "icofont-brand-whatsapp", title: messages.contactDetails.whatsapp, value: "+49 (0) 152 06419253" }
  ];
  const fallbackSocials = [
    { icon: "fa-brands fa-instagram", label: "Instagram", url: "https://www.instagram.com/" },
    { icon: "fa-brands fa-linkedin-in", label: "LinkedIn", url: "https://www.linkedin.com/" }
  ];

  const detailItemsSource = Array.isArray(cms?.details?.items) ? cms?.details?.items : fallbackDetailsItems;
  const detailItems = detailItemsSource
    .map(item => ({
      icon: String(item?.icon || "").trim() || "icofont-info-circle",
      title: String(item?.title || "").trim(),
      value: String(item?.value || "").trim()
    }))
    .filter(item => Boolean(item.title) && Boolean(item.value))
    .slice(0, 12);

  const socialsSource = Array.isArray(cms?.details?.socials) ? cms?.details?.socials : fallbackSocials;
  const socials = socialsSource
    .map(item => ({
      icon: String(item?.icon || "").trim() || "fa-brands fa-linkedin-in",
      label: String(item?.label || "").trim(),
      url: String(item?.url || "").trim()
    }))
    .filter(item => Boolean(item.label) && Boolean(item.url))
    .slice(0, 12);

  return {
    hero: {
      subtitle: String(cms?.hero?.subtitle || messages.contactHero.subtitle || "").trim(),
      title: String(cms?.hero?.title || messages.contactHero.title || "").trim(),
      home: String(cms?.hero?.home || messages.contactHero.home || "").trim(),
      crumb: String(cms?.hero?.crumb || messages.contactHero.crumb || "").trim(),
      backgroundImage:
        withApiBaseIfNeeded(String(cms?.hero?.backgroundImage || "").trim()) ||
        "/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6629.jpg"
    },
    details: {
      ...messages.contactDetails,
      subtitle: String(cms?.details?.subtitle || messages.contactDetails.subtitle || "").trim(),
      title: String(cms?.details?.title || messages.contactDetails.title || "").trim(),
      description: String(cms?.details?.description || messages.contactDetails.description || "").trim(),
      items: detailItems.length > 0 ? detailItems : fallbackDetailsItems,
      socials: socials.length > 0 ? socials : fallbackSocials
    },
    form: {
      ...messages.contactForm,
      action: String(cms?.form?.action || "https://meri-boarding.de/boarding-booking.php").trim(),
      name: String(cms?.form?.name || messages.contactForm.name || "").trim(),
      email: String(cms?.form?.email || messages.contactForm.email || "").trim(),
      phone: String(cms?.form?.phone || messages.contactForm.phone || "").trim(),
      message: String(cms?.form?.message || messages.contactForm.message || "").trim(),
      send: String(cms?.form?.send || messages.contactForm.send || "").trim(),
      success: String(cms?.form?.success || messages.contactForm.success || "").trim(),
      error: String(cms?.form?.error || messages.contactForm.error || "").trim(),
      namePlaceholder: String(cms?.form?.namePlaceholder || messages.contactForm.namePlaceholder || "").trim(),
      emailPlaceholder: String(cms?.form?.emailPlaceholder || messages.contactForm.emailPlaceholder || "").trim(),
      phonePlaceholder: String(cms?.form?.phonePlaceholder || messages.contactForm.phonePlaceholder || "").trim(),
      messagePlaceholder: String(cms?.form?.messagePlaceholder || messages.contactForm.messagePlaceholder || "").trim()
    }
  };
}

export async function fetchContactResolvedContent(locale: Locale): Promise<ContactResolvedContent> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/public/content/contact?locale=${locale}`, {
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch contact content (${response.status})`);
    }

    const data = await response.json();
    return resolveContent(locale, data?.content || {});
  } catch (error) {
    console.error("[public-fe] falling back to local contact content", error);
    return resolveContent(locale, {});
  }
}
