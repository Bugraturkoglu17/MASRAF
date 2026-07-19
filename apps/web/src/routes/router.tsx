import { createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute } from './ProtectedRoute';

import { AuthLayout } from '@/layouts/AuthLayout';
import { MainLayout } from '@/layouts/MainLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { ErrorPage } from '@/pages/ErrorPage';
import { ExpensesPlaceholderPage } from '@/pages/ExpensesPlaceholderPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { NotificationsPlaceholderPage } from '@/pages/NotificationsPlaceholderPage';
import { ProfilePlaceholderPage } from '@/pages/ProfilePlaceholderPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    errorElement: <ErrorPage />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/expenses', element: <ExpensesPlaceholderPage /> },
          { path: '/notifications', element: <NotificationsPlaceholderPage /> },
          { path: '/profile', element: <ProfilePlaceholderPage /> },
        ],
      },
    ],
  },
  { path: '/403', element: <UnauthorizedPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
