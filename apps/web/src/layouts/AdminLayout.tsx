import { FileClock, Home, Layout, Settings, User, Users } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useToast } from '@/components/feedback/toast-context';
import { MobileBottomNavigation } from '@/components/navigation/MobileBottomNavigation';
import { useAuth } from '@/features/auth/auth-context';

const navItems = [
  { to: '/admin', label: 'Admin Paneli', icon: Home, exact: true },
  { to: '/admin/users', label: 'Kullanıcı Yönetimi', icon: Users },
  { to: '/admin/audit-logs', label: 'Denetim Kayıtları', icon: FileClock },
  { to: '/admin/profile', label: 'Profilim', icon: User },
  ...(import.meta.env.DEV
    ? [{ to: '/admin/pwa-diagnostics', label: 'PWA Tanılama', icon: Settings }]
    : []),
];

const viewItems = [
  { to: '/', label: 'Kullanıcı Görünümü', icon: Layout },
  { to: '/manager', label: 'Yönetici Görünümü', icon: Settings },
];

export function AdminLayout(): JSX.Element {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    showToast('Çıkış yapıldı.', 'info');
  };

  return (
    <div className="app-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <aside style={sidebarStyle} className="app-sidebar">
        <div style={brandStyle}>
          <span style={brandIconStyle}>₺</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Masraf</div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>ADMİN PANELİ</div>
          </div>
        </div>

        <nav style={navStyle}>
          <div style={sectionLabel}>YÖNETİM</div>
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

          <div style={{ ...sectionLabel, marginTop: 16 }}>GÖRÜNÜM DEĞİŞTİR</div>
          {viewItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              style={({ isActive }) => navLinkStyle(isActive, '#60a5fa')}
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
            Çıkış
          </button>
        </div>
      </aside>

      <main
        className="app-main"
        style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg)' }}
      >
        <Outlet />
      </main>
      <MobileBottomNavigation role="ADMIN" />
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
  background: '#7c3aed',
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

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#475569',
  letterSpacing: '0.1em',
  padding: '4px 12px 6px',
  marginTop: 4,
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
  padding: '8px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent',
  color: '#94a3b8',
  fontSize: 12,
  cursor: 'pointer',
};
