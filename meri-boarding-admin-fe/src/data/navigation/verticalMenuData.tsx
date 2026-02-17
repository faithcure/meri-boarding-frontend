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
    label: 'About',
    href: '/about',
    icon: 'bx-info-circle'
  }
]

export default verticalMenuData
