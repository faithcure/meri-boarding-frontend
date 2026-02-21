// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'

const verticalMenuData = (): VerticalMenuDataType[] => [
  {
    label: 'Home',
    href: '/home',
    icon: 'bx-home'
  },
  {
    label: 'Hotels',
    href: '/hotels',
    icon: 'bx-building-house'
  },
  {
    label: 'Home Content',
    href: '/content-home',
    icon: 'bx-edit-alt'
  },
  {
    label: 'Services Content',
    href: '/content-services',
    icon: 'bx-briefcase-alt-2'
  },
  {
    label: 'Reservation Content',
    href: '/content-reservation',
    icon: 'bx-calendar'
  },
  {
    label: 'Amenities Content',
    href: '/content-amenities',
    icon: 'bx-grid-alt'
  },
  {
    label: 'Contact Content',
    href: '/content-contact',
    icon: 'bx-envelope'
  },
  {
    label: 'General Settings',
    href: '/system/general-settings',
    icon: 'bx-slider-alt'
  },
  {
    label: 'About',
    href: '/about',
    icon: 'bx-info-circle'
  }
]

export default verticalMenuData
