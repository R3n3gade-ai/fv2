import React from 'react'
import CIcon from '@coreui/icons-react'

const _nav = [
  {
    _tag: 'CSidebarNavTitle',
    _children: ['Trading Tools']
  },
  {
    _tag: 'CSidebarNavItem',
    name: 'Charts',
    to: '/dashboard',
    icon: <CIcon content={React.icons.cilChartLine} customClasses="c-sidebar-nav-icon"/>
  },
  {
    _tag: 'CSidebarNavItem',
    name: 'Blocks',
    to: '/blocks',
    className: 'fifth-step',
    icon: <CIcon content={React.icons.cisImageBroken} customClasses="c-sidebar-nav-icon"/>
  },
  // {
  //   _tag: 'CSidebarNavTitle',
  //   _children: ['Account']
  // },
  // {
  //   _tag: 'CSidebarNavItem',
  //   name: 'Profile',
  //   to: '/account/profile',
  //   className: '',
  //   icon: <CIcon content={React.icons.cisUser} customClasses="c-sidebar-nav-icon"/>
  // },
  // {
  //   _tag: 'CSidebarNavDropdown',
  //   name: 'Compliance',
  //   route: '#',
  //   icon: <CIcon content={React.icons.cisDocument} customClasses="c-sidebar-nav-icon"/>,
  //   _children: [
  //     {
  //       _tag: 'CSidebarNavItem',
  //       name: 'View Compliance',
  //       to: '#',
  //     },
  //     {
  //       _tag: 'CSidebarNavItem',
  //       name: 'Edit Compliance',
  //       to: '#',
  //     }
  //   ],
  // },
  // {
  //   _tag: 'CSidebarNavTitle',
  //   _children: ['Administration']
  // },
  // {
  //   _tag: 'CSidebarNavItem',
  //   name: 'Users Management',
  //   to: '/admin/users',
  //   className: '',
  //   icon: <CIcon content={React.icons.cisListRich} customClasses="c-sidebar-nav-icon"/>
  // },
]

export default _nav