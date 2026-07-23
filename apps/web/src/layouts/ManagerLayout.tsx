import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCircle, Clock, Home, User, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useNavigation } from 'react-router-dom';

import { RouteTransitionLoader } from '@/components/feedback/RouteTransitionLoader';
import { useToast } from '@/components/feedback/toast-context';
import { MobileBottomNavigation } from '@/components/navigation/MobileBottomNavigation';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch } from '@/lib/api-client';
import { useManagerSse } from '@/lib/use-manager-sse';

const navItems = [
  { to: '/manager', label: 'Ana Sayfa', icon: Home, exact: true },
  { to: '/manager/pending', label: 'Onayda Bekleyen', icon: Clock },
  { to: '/manager/approved', label: 'Onaylananlar', icon: CheckCircle },
  { to: '/manager/rejected', label: 'Reddedilenler', icon: XCircle },
  { to: '/manager/notifications', label: 'Bildirimler', icon: Bell },
  { to: '/manager/profile', label: 'Profilim', icon: User },
];

export function ManagerLayout(): JSX.Element {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();
  const mainRef = useRef<HTMLElement>(null);
  const isPending = navigation.state !== 'idle';
  const realtimeStatus = useManagerSse();

  const { data: notifications } = useQuery<{ readAt: string | null }[]>({
    queryKey: ['notifications'],
    queryFn: () => apiFetch('/notifications'),
    refetchInterval: 30_000,
  });
  const unreadCount = useMemo(
    () => (notifications ?? []).filter((n) => !n.readAt).length,
    [notifications],
  );

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    void import('@/pages/manager/ManagerPendingPage');
    void import('@/pages/manager/ManagerApprovedPage');
    void import('@/pages/manager/ManagerRejectedPage');
    void import('@/pages/user/UserProfilePage');
    void import('@/pages/NotificationsPage');
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    showToast('Çıkış yapıldı.', 'info');
  };

  return (
    <div className="app-shell" style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      <aside style={sidebarStyle} className="app-sidebar">
        <div style={brandStyle}>
          <span style={brandIconStyle}>₺</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Masraf</div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>YÖNETİCİ PANELİ</div>
          </div>
        </div>

        <nav style={navStyle}>
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink key={to} to={to} end={exact} style={({ isActive }) => navLinkStyle(isActive)}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon size={18} />
                {label === 'Bildirimler' && unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -5,
                      right: -8,
                      minWidth: 15,
                      height: 15,
                      padding: '0 3px',
                      borderRadius: 99,
                      background: '#dc2626',
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 700,
                      display: 'grid',
                      placeItems: 'center',
                      lineHeight: 1,
                    }}
                  >
                    {Math.min(unreadCount, 99)}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={footerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={avatarStyle}>
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Yönetici</div>
            </div>
          </div>
          <button onClick={handleLogout} style={logoutBtnStyle}>
            Çıkış
          </button>
        </div>
      </aside>

      <main
        ref={mainRef}
        className="app-main"
        style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg)' }}
      >
        {isPending && <RouteTransitionLoader />}
        {realtimeStatus !== 'connected' && (
          <div className="realtime-status-banner" role="status">
            {realtimeStatus === 'polling'
              ? 'Canlı bağlantı kurulamadı. Veriler 30 saniyede bir güvenli şekilde yenileniyor.'
              : 'Canlı bağlantı yeniden kuruluyor…'}
          </div>
        )}
        <div key={location.pathname} className="page-view">
          <Outlet />
        </div>
      </main>
      <MobileBottomNavigation key={location.pathname} role="MANAGER" unreadCount={unreadCount} />
    </div>
  );
}

const sidebarStyle: React.CSSProperties = {
  width: 240,
  minWidth: 240,
  background: 'var(--color-sidebar-bg)',
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid rgba(255,255,255,0.06)',
};

const brandStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '20px 20px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const brandIconStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  background: '#1e3a8a',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  fontWeight: 700,
  color: '#fff',
  flexShrink: 0,
};

const navStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '9px 12px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  color: isActive ? '#fff' : 'var(--color-sidebar-text)',
  background: isActive ? 'rgba(30,58,138,0.18)' : 'transparent',
  textDecoration: 'none',
  borderLeft: isActive ? '3px solid #1e3a8a' : '3px solid transparent',
});

const footerStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderTop: '1px solid rgba(255,255,255,0.06)',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const avatarStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  background: '#1e3a8a',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  fontWeight: 600,
  flexShrink: 0,
};

const logoutBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent',
  color: '#94a3b8',
  fontSize: 12,
  cursor: 'pointer',
};
