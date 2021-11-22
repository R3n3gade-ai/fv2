import React from 'react';

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'));
const Blocks = React.lazy(() => import('./views/dashboard/Blocks'));
const Profile = React.lazy(() => import('./views/dashboard/account/Profile'));
const AdminUsers = React.lazy(() => import('./views/dashboard/admin/Users'));

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Charts', component: Dashboard },
  { path: '/blocks', name: 'Blocks', component: Blocks },
  { path: '/account/profile', name: 'Profile', component: Profile },
  { path: '/admin/users', name: 'Users List', component: AdminUsers }
]

export default routes;