// MUI Imports
import { useTheme } from '@mui/material/styles'

// Type Imports
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import HorizontalNav, { Menu, MenuItem, SubMenu } from '@menu/horizontal-menu'
import VerticalNavContent from './VerticalNavContent'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Styled Component Imports
import StyledHorizontalNavExpandIcon from '@menu/styles/horizontal/StyledHorizontalNavExpandIcon'
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/horizontal/menuItemStyles'
import menuRootStyles from '@core/styles/horizontal/menuRootStyles'
import verticalMenuItemStyles from '@core/styles/vertical/menuItemStyles'
import verticalNavigationCustomStyles from '@core/styles/vertical/navigationCustomStyles'
import verticalMenuSectionStyles from '@core/styles/vertical/menuSectionStyles'

type RenderExpandIconProps = {
  level?: number
}

type RenderVerticalExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

const RenderExpandIcon = ({ level }: RenderExpandIconProps) => (
  <StyledHorizontalNavExpandIcon level={level}>
    <i className='bx-chevron-right' />
  </StyledHorizontalNavExpandIcon>
)

const RenderVerticalExpandIcon = ({ open, transitionDuration }: RenderVerticalExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='bx-chevron-right' />
  </StyledVerticalNavExpandIcon>
)

const HorizontalMenu = () => {
  // Hooks
  const verticalNavOptions = useVerticalNav()
  const theme = useTheme()

  // Vars
  const { transitionDuration } = verticalNavOptions

  return (
    <HorizontalNav
      switchToVertical
      verticalNavContent={VerticalNavContent}
      verticalNavProps={{
        customStyles: verticalNavigationCustomStyles(verticalNavOptions, theme),
        backgroundColor: 'var(--mui-palette-background-paper)'
      }}
    >
      <Menu
        rootStyles={menuRootStyles(theme)}
        renderExpandIcon={({ level }) => <RenderExpandIcon level={level} />}
        menuItemStyles={menuItemStyles(theme, 'bx-bxs-circle')}
        renderExpandedMenuItemIcon={{ icon: <i className='bx-bxs-circle' /> }}
        popoutMenuOffset={{
          mainAxis: ({ level }) => (level && level > 0 ? 6 : 10),
          alignmentAxis: 0
        }}
        verticalMenuProps={{
          menuItemStyles: verticalMenuItemStyles(verticalNavOptions, theme),
          renderExpandIcon: ({ open }) => (
            <RenderVerticalExpandIcon open={open} transitionDuration={transitionDuration} />
          ),
          renderExpandedMenuItemIcon: { icon: <i className='bx-bxs-circle' /> },
          menuSectionStyles: verticalMenuSectionStyles(verticalNavOptions, theme)
        }}
      >
        <MenuItem href='/home' icon={<i className='bx-home' />}>
          Home
        </MenuItem>
        <MenuItem href='/hotels' icon={<i className='bx-building-house' />}>
          Hotels
        </MenuItem>
        <SubMenu label='Home Content' icon={<i className='bx-edit-alt' />}>
          <MenuItem href='/content-home' icon={<i className='bx-sort' />}>
            Section Order
          </MenuItem>
          <MenuItem href='/content-home/hero' icon={<i className='bx-image' />}>
            Hero Settings
          </MenuItem>
          <MenuItem href='/content-home/rooms' icon={<i className='bx-layout' />}>
            Rooms Settings
          </MenuItem>
          <MenuItem href='/content-home/testimonials' icon={<i className='bx-message-rounded-dots' />}>
            Testimonials Settings
          </MenuItem>
          <MenuItem href='/content-home/facilities' icon={<i className='bx-bar-chart-alt-2' />}>
            Facilities Settings
          </MenuItem>
          <MenuItem href='/content-home/gallery' icon={<i className='bx-images' />}>
            Gallery Settings
          </MenuItem>
          <MenuItem href='/content-home/offers' icon={<i className='bx-purchase-tag-alt' />}>
            Offers Settings
          </MenuItem>
          <MenuItem href='/content-home/faq' icon={<i className='bx-help-circle' />}>
            FAQ Settings
          </MenuItem>
        </SubMenu>
        <MenuItem href='/content-services' icon={<i className='bx-briefcase-alt-2' />}>
          Services Content
        </MenuItem>
        <MenuItem href='/content-reservation' icon={<i className='bx-calendar' />}>
          Reservation Content
        </MenuItem>
        <MenuItem href='/content-amenities' icon={<i className='bx-grid-alt' />}>
          Amenities Content
        </MenuItem>
        <MenuItem href='/content-contact' icon={<i className='bx-envelope' />}>
          Contact Content
        </MenuItem>
        <SubMenu label='Forms & Messages' icon={<i className='bx-message-square-dots' />}>
          <MenuItem href='/contact-submissions' icon={<i className='bx-mail-send' />}>
            Contact Submissions
          </MenuItem>
          <MenuItem href='/form-messages/partners' icon={<i className='bx-images' />}>
            Partner Logos
          </MenuItem>
        </SubMenu>
        <MenuItem href='/about' icon={<i className='bx-info-circle' />}>
          About
        </MenuItem>
      </Menu>
      {/* <Menu
        rootStyles={menuRootStyles(theme)}
        renderExpandIcon={({ level }) => <RenderExpandIcon level={level} />}
        menuItemStyles={menuItemStyles(theme, 'bx-bxs-circle')}
        renderExpandedMenuItemIcon={{ icon: <i className='bx-bxs-circle' /> }}
        popoutMenuOffset={{
          mainAxis: ({ level }) => (level && level > 0 ? 6 : 10),
          alignmentAxis: 0
        }}
        verticalMenuProps={{
          menuItemStyles: verticalMenuItemStyles(verticalNavOptions, theme),
          renderExpandIcon: ({ open }) => (
            <RenderVerticalExpandIcon open={open} transitionDuration={transitionDuration} />
          ),
          renderExpandedMenuItemIcon: { icon: <i className='bx-bxs-circle' /> },
          menuSectionStyles: verticalMenuSectionStyles(verticalNavOptions, theme)
        }}
      >
        <GenerateHorizontalMenu menuData={menuData(dictionary)} />
      </Menu> */}
    </HorizontalNav>
  )
}

export default HorizontalMenu
