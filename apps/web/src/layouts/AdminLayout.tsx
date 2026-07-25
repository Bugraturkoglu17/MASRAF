import { FileClock, Home, Settings, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useNavigation } from 'react-router-dom';

import { BrandLogo } from '@/components/BrandLogo';
import { RouteTransitionLoader } from '@/components/feedback/RouteTransitionLoader';
import { useToast } from '@/components/feedback/toast-context';
import { MobileBottomNavigation } from '@/components/navigation/MobileBottomNavigation';
import { useAuth } from '@/features/auth/auth-context';

const navItems = [
  { to: '/admin', label: 'Ana Sayfa', icon: Home, exact: true },
  { to: '/admin/users', label: 'Kullanıcılar', icon: Users, exact: true },
  { to: '/admin/users/new', label: 'Yeni Kullanıcı', icon: UserPlus },
  { to: '/admin/manager', label: 'Yönetici Hesabı', icon: ShieldCheck },
  { to: '/admin/audit-logs', label: 'İşlem Kayıtları', icon: FileClock },
  { to: '/admin/settings', label: 'Sistem Ayarları', icon: Settings },
];

export function AdminLayout(): JSX.Element {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();
  const mainRef = useRef<HTMLElement>(null);
  const isPending = navigation.state !== 'idle';

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    void import('@/pages/admin/AdminUsersPage');
    void import('@/pages/admin/AdminNewUserPage');
    void import('@/pages/admin/AdminUserDetailPage');
    void import('@/pages/admin/AdminManagerPage');
    void import('@/pages/admin/AdminAuditLogsPage');
    void import('@/pages/admin/AdminSystemOverviewPage');
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
          <BrandLogo subtitle="ADMİN PANELİ" />
        </div>

        <nav style={navStyle}>
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              style={({ isActive }) => navLinkStyle(isActive, '#a78bfa')}
            >
              <Icon size={18} />
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
              <div style={{ fontSize: 11, color: '#a78bfa' }}>Admin</div>
            </div>
          </div>
          <button onClick={handleLogout} style={logoutBtnStyle}>
            Çıkış Yap
          </button>
        </div>
      </aside>

      <main
        ref={mainRef}
        className="app-main"
        style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg)' }}
      >
        {isPending && <RouteTransitionLoader />}
        <div key={location.pathname} className="page-view">
          <Outlet />
        </div>
      </main>
      <MobileBottomNavigation key={location.pathname} role="ADMIN" />
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
  padding: '18px 20px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const navStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const navLinkStyle = (isActive: boolean, accent: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '9px 12px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  color: isActive ? '#fff' : 'var(--color-sidebar-text)',
  background: isActive ? `${accent}1a` : 'transparent',
  textDecoration: 'none',
  borderLeft: isActive ? `3px solid ${accent}` : '3px solid transparent',
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
  background: '#7c3aed',
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
  padding: '10px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'transparent',
  color: '#cbd5e1',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};
