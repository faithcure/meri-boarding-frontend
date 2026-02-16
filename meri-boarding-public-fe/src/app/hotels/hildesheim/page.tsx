import DynamicHotelPage from '../[slug]/page'

type Props = {
  params?: { locale?: 'en' | 'de' | 'tr' } | Promise<{ locale?: 'en' | 'de' | 'tr' }>
}

export default async function HildesheimPage({ params }: Props = {}) {
  const resolved = await params
  return DynamicHotelPage({ params: Promise.resolve({ locale: resolved?.locale, slug: 'hildesheim' }) })
}
