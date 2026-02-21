// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Type Imports
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, MenuItem, SubMenu } from '@menu/vertical-menu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='bx-chevron-right' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ scrollMenu }: Props) => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // Hooks
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()

  // Vars
  const { transitionDuration, isBreakpointReached } = verticalNavOptions

  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  useEffect(() => {
    const profileRaw = window.localStorage.getItem('admin_profile')

    if (!profileRaw) {
      setIsSuperAdmin(false)

      return
    }

    try {
      const profile = JSON.parse(profileRaw) as { role?: string }

      setIsSuperAdmin(profile.role === 'super_admin')
    } catch {
      setIsSuperAdmin(false)
    }
  }, [])

  return (
    // eslint-disable-next-line lines-around-comment
    /* Custom scrollbar instead of browser scroll, remove if you want browser scroll only */
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
            className: 'bs-full overflow-y-auto overflow-x-hidden',
            onScroll: container => scrollMenu(container, false)
          }
        : {
            options: { wheelPropagation: false, suppressScrollX: true },
            onScrollY: container => scrollMenu(container, true)
          })}
    >
      {/* Incase you also want to scroll NavHeader to scroll with Vertical Menu, remove NavHeader from above and paste it below this comment */}
      {/* Vertical Menu */}
      <Menu
        popoutMenuOffset={{ mainAxis: 27 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='bx-bxs-circle' /> }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
        <MenuItem href='/home' icon={<i className='bx-home' />}>
          Home
        </MenuItem>
        <MenuItem href='/hotels' icon={<i className='bx-building-house' />}>
          Hotels
        </MenuItem>
        <SubMenu label='Content Management' icon={<i className='bx-edit-alt' />}>
          <SubMenu label='Home Content' icon={<i className='bx-home-circle' />}>
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
        </SubMenu>
        <SubMenu label='Forms & Messages' icon={<i className='bx-message-square-dots' />}>
          <MenuItem href='/contact-submissions' icon={<i className='bx-mail-send' />}>
            Contact Submissions
          </MenuItem>
          <MenuItem href='/form-messages/partners' icon={<i className='bx-images' />}>
            Partner Logos
          </MenuItem>
        </SubMenu>
        <SubMenu label='System' icon={<i className='bx-cog' />}>
          <MenuItem href='/system/general-settings' icon={<i className='bx-slider-alt' />}>
            General Settings
          </MenuItem>
          {isSuperAdmin ? (
            <MenuItem href='/users' icon={<i className='bx-group' />}>
              Users
            </MenuItem>
          ) : null}
          <MenuItem href='/about' icon={<i className='bx-info-circle' />}>
            About
          </MenuItem>
        </SubMenu>
      </Menu>
      {/* <Menu
        popoutMenuOffset={{ mainAxis: 27 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='bx-bxs-circle' /> }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
        <GenerateVerticalMenu menuData={menuData(dictionary)} />
      </Menu> */}
    </ScrollWrapper>
  )
}

export default VerticalMenu
