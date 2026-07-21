import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { ProfileGuard } from './ProfileGuard';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';

import { FullScreenLoader } from '@/components/feedback/FullScreenLoader';
import { OfflinePage } from '@/components/pwa/OfflinePage';
import { AuthLayout } from '@/layouts/AuthLayout';
import { UserLayout } from '@/layouts/UserLayout';
import { ErrorPage } from '@/pages/ErrorPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { UserApprovalsPage } from '@/pages/user/UserApprovalsPage';
import { UserDashboard } from '@/pages/user/UserDashboard';
import { UserExpensesPage } from '@/pages/user/UserExpensesPage';
import { UserProfilePage } from '@/pages/user/UserProfilePage';

const ProfileCompletePage = lazy(() =>
  import('@/pages/ProfileCompletePage').then((m) => ({ default: m.ProfileCompletePage })),
);

// USER lazy pages (less-frequent paths)
const CreateExpensePage = lazy(() =>
  import('@/pages/user/CreateExpensePage').then((m) => ({ default: m.CreateExpensePage })),
);
const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  })),
);

// MANAGER pages
const ManagerLayout = lazy(() =>
  import('@/layouts/ManagerLayout').then((m) => ({ default: m.ManagerLayout })),
);
const ManagerDashboard = lazy(() =>
  import('@/pages/manager/ManagerDashboard').then((m) => ({ default: m.ManagerDashboard })),
);
const ManagerPendingPage = lazy(() =>
  import('@/pages/manager/ManagerPendingPage').then((m) => ({ default: m.ManagerPendingPage })),
);
const ManagerApprovedPage = lazy(() =>
  import('@/pages/manager/ManagerApprovedPage').then((m) => ({ default: m.ManagerApprovedPage })),
);
const ManagerRejectedPage = lazy(() =>
  import('@/pages/manager/ManagerRejectedPage').then((m) => ({ default: m.ManagerRejectedPage })),
);

// ADMIN pages
const AdminLayout = lazy(() =>
  import('@/layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const AdminDashboard = lazy(() =>
  import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
);
const AdminUsersPage = lazy(() =>
  import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
);
const AdminAuditLogsPage = lazy(() =>
  import('@/pages/admin/AdminAuditLogsPage').then((m) => ({ default: m.AdminAuditLogsPage })),
);
const PwaDiagnosticsPage = lazy(() =>
  import('@/pages/admin/PwaDiagnosticsPage').then((m) => ({ default: m.PwaDiagnosticsPage })),
);

// eslint-disable-next-line react-refresh/only-export-components
function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<FullScreenLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    errorElement: <ErrorPage />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },

  // Profil tamamlama — giriş zorunlu ama profil tamamlanmamış
  {
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/complete-profile',
        element: (
          <S>
            <ProfileCompletePage />
          </S>
        ),
      },
    ],
  },

  // USER paneli
  {
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <ProfileGuard />,
        children: [
          {
            element: <RoleRoute allowed={['USER', 'ADMIN']} />,
            children: [
              {
                element: <UserLayout />,
                children: [
                  {
                    path: '/',
                    element: <UserDashboard />,
                  },
                  {
                    path: '/expenses',
                    element: <UserExpensesPage />,
                  },
                  {
                    path: '/expenses/new',
                    element: (
                      <S>
                        <CreateExpensePage />
                      </S>
                    ),
                  },
                  {
                    path: '/approvals',
                    element: <UserApprovalsPage />,
                  },
                  {
                    path: '/profile',
                    element: <UserProfilePage />,
                  },
                  {
                    path: '/notifications',
                    element: (
                      <S>
                        <NotificationsPage />
                      </S>
                    ),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // MANAGER paneli
  {
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <ProfileGuard />,
        children: [
          {
            element: <RoleRoute allowed={['MANAGER', 'ADMIN']} />,
            children: [
              {
                element: (
                  <S>
                    <ManagerLayout />
                  </S>
                ),
                children: [
                  {
                    path: '/manager',
                    element: (
                      <S>
                        <ManagerDashboard />
                      </S>
                    ),
                  },
                  {
                    path: '/manager/pending',
                    element: (
                      <S>
                        <ManagerPendingPage />
                      </S>
                    ),
                  },
                  {
                    path: '/manager/approved',
                    element: (
                      <S>
                        <ManagerApprovedPage />
                      </S>
                    ),
                  },
                  {
                    path: '/manager/rejected',
                    element: (
                      <S>
                        <ManagerRejectedPage />
                      </S>
                    ),
                  },
                  {
                    path: '/manager/profile',
                    element: (
                      <S>
                        <UserProfilePage />
                      </S>
                    ),
                  },
                  {
                    path: '/manager/notifications',
                    element: (
                      <S>
                        <NotificationsPage />
                      </S>
                    ),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // ADMIN paneli
  {
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <ProfileGuard />,
        children: [
          {
            element: <RoleRoute allowed={['ADMIN']} />,
            children: [
              {
                element: (
                  <S>
                    <AdminLayout />
                  </S>
                ),
                children: [
                  {
                    path: '/admin',
                    element: (
                      <S>
                        <AdminDashboard />
                      </S>
                    ),
                  },
                  {
                    path: '/admin/users',
                    element: (
                      <S>
                        <AdminUsersPage />
                      </S>
                    ),
                  },
                  {
                    path: '/admin/audit-logs',
                    element: (
                      <S>
                        <AdminAuditLogsPage />
                      </S>
                    ),
                  },
                  {
                    path: '/admin/profile',
                    element: (
                      <S>
                        <UserProfilePage />
                      </S>
                    ),
                  },
                  {
                    path: '/admin/notifications',
                    element: (
                      <S>
                        <NotificationsPage />
                      </S>
                    ),
                  },
                  ...(import.meta.env.DEV
                    ? [
                        {
                          path: '/admin/pwa-diagnostics',
                          element: (
                            <S>
                              <PwaDiagnosticsPage />
                            </S>
                          ),
                        },
                      ]
                    : []),
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  { path: '/403', element: <UnauthorizedPage /> },
  { path: '/offline', element: <OfflinePage /> },
  { path: '*', element: <NotFoundPage /> },
]);
