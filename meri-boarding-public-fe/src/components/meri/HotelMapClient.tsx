'use client'

import dynamic from 'next/dynamic'

type HotelMapClientProps = {
  title: string
  query: string
  lat: number
  lng: number
  zoom?: number
}

const HotelLeafletMapSection = dynamic(() => import('@/components/meri/HotelLeafletMapSection'), {
  ssr: false
})

export default function HotelMapClient(props: HotelMapClientProps) {
  return <HotelLeafletMapSection {...props} />
}

