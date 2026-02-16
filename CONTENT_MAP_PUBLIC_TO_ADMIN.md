# Meri Boarding Public -> Admin Content Map

## 1) Core Sources

- Main content source: `meri-boarding-public-fe/src/i18n/locales/en.json`
- Locale variants: `meri-boarding-public-fe/src/i18n/locales/de.json`, `meri-boarding-public-fe/src/i18n/locales/tr.json`
- Content resolver: `meri-boarding-public-fe/src/i18n/messages.ts`
- Main page composition: `meri-boarding-public-fe/src/app/home-page.tsx`

Top-level translatable sections in `en.json`:
- `hero`
- `facilities`
- `testimonials`
- `gallery`
- `offers`
- `faq`
- `servicesHero`
- `servicesContent`
- `bookingForm`
- `reservation`
- `hotels`
- `hotelDetail`
- `contactHero`
- `contactDetails`
- `contactForm`
- `bookingInquiryForm`
- `header`
- `footer`
- `chatWidget`
- `amenitiesHero`
- `rooms`
- `amenitiesContent`
- `amenitiesData`
- `terms`
- `imprint`
- `privacy`
- `notFound`

## 2) Page -> Content Ownership

- Home (`/`): `hero`, `rooms`, `testimonials`, `facilities`, `gallery`, `offers`, `faq`
- Services (`/services`): `servicesHero`, `servicesContent`
- Amenities (`/amenities`): `amenitiesHero`, `amenitiesContent`, `amenitiesData`
- Hotels list (`/hotels`): `hotels` (hero, cards, overview facts, highlights, CTA)
- Hotel detail pages (`/hotels/flamingo|europaplatz|hildesheim`): `hotelDetail.<slug>`
- Reservation (`/reservation`): `reservation`, `bookingInquiryForm`
- Contact (`/contact`): `contactHero`, `contactDetails`, `contactForm`, `bookingInquiryForm`
- Legal pages: `terms`, `privacy`, `imprint`
- Shared layout/menu/footer/chat: `header`, `footer`, `chatWidget`

## 3) Hardcoded Items (Move to Admin Data ASAP)

- Form target URLs:
  - `meri-boarding-public-fe/src/components/meri/ContactForm.tsx` (`action="https://meri-boarding.de/boarding-booking.php"`)
  - `meri-boarding-public-fe/src/components/meri/BookingInquiryForm.tsx` (same)
- Static media lists (not from CMS/json):
  - `meri-boarding-public-fe/src/components/meri/Hero.tsx` (slider image array)
  - `meri-boarding-public-fe/src/components/meri/Gallery.tsx` (gallery image grid)
  - `meri-boarding-public-fe/src/app/hotels/flamingo/page.tsx` (carousel + gallery arrays + contact block)
  - `meri-boarding-public-fe/src/app/hotels/europaplatz/page.tsx` (carousel + gallery arrays + contact block)
  - `meri-boarding-public-fe/src/app/hotels/hildesheim/page.tsx` (carousel + gallery arrays + contact block)
- Reservation options hardcoded:
  - `meri-boarding-public-fe/src/app/reservation/page.tsx` (`boardingOptions` array)
  - `meri-boarding-public-fe/src/components/meri/BookingInquiryForm.tsx` (`boardingOptions` array)
- Locale switcher labels hardcoded:
  - `meri-boarding-public-fe/src/components/meri/LocaleSwitcher.tsx`
- SEO metadata hardcoded:
  - `meri-boarding-public-fe/src/app/layout.tsx` (`metadata.title`, `metadata.description`)

## 4) Recommended Admin Modules (MVP)

- `Content / Home`
  - Hero, facilities, testimonials, gallery text, offers, FAQ
- `Content / Services`
  - Hero + feature cards + support list
- `Content / Amenities`
  - Hero + layout blocks + amenity cards
- `Content / Hotels`
  - Hotels list cards + per-hotel detail content + image galleries
- `Content / Reservation`
  - Short/long stay text blocks, helper cards, option lists
- `Content / Contact`
  - Contact hero/details/form labels + inquiry form labels/options
- `Content / Legal`
  - Terms, Privacy, Imprint sections
- `Shared`
  - Header menu labels, footer blocks, chat widget text, global SEO
- `Media`
  - Reusable asset library and gallery picker

## 5) Data Model Proposal (API)

- `pages` collection:
  - `slug` (`home`, `services`, `amenities`, `reservation`, `contact`, `hotels`, `hotel-detail/flamingo`, ...)
  - `locale` (`en`, `de`, `tr`)
  - `status` (`draft`, `published`)
  - `sections` (JSON blocks)
  - `updatedBy`, `updatedAt`
- `site_settings` collection:
  - header, footer, chatWidget, seo defaults
- `media` collection:
  - asset metadata (`url`, `alt`, `tags`, `usage`)

## 6) Suggested Execution Order

1. Move `header/footer/chatWidget` to API-backed content.
2. Move `home` sections from `en.json` to API.
3. Move hotels list + hotel detail pages (including hardcoded galleries).
4. Move reservation/contact forms and remove hardcoded `boardingOptions`.
5. Move legal pages and SEO metadata.
6. Add publish workflow (`draft -> published`) in admin.

