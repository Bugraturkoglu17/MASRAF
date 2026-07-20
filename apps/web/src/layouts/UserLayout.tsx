import { CheckCircle, Clock, FileText, Home, PlusCircle, User, XCircle } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useToast } from '@/components/feedback/toast-context';
import { useAuth } from '@/features/auth/auth-context';

const navItems = [
  { to: '/', label: 'Ana Sayfa', icon: Home, exact: true },
  { to: '/expenses/new', label: 'Masraf Yükle', icon: PlusCircle },
  { to: '/expenses?status=DRAFT', label: 'Taslaklar', icon: FileText },
  { to: '/expenses?status=PENDING', label: 'Onayda Bekleyen', icon: Clock },
  { to: '/expenses?status=APPROVED', label: 'Onaylananlar', icon: CheckCircle },
  { to: '/expenses?status=REJECTED', label: 'Reddedilenler', icon: XCircle },
  { to: '/profile', label: 'Profilim', icon: User },
];

export function UserLayout(): JSX.Element {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    showToast('Çıkış yapıldı.', 'info');
  };

  return (
    <div style={wrapStyle}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <div style={brandStyle}>
          <span style={brandIconStyle}>₺</span>
          <span style={brandTextStyle}>Masraf</span>
        </div>

        <nav style={navStyle}>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => navLinkStyle(isActive)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={sidebarFooterStyle}>
          <div style={userInfoStyle}>
            <div style={avatarStyle}>
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Kullanıcı</div>
            </div>
          </div>
          <button onClick={handleLogout} style={logoutBtnStyle}>
            Çıkış
          </button>
        </div>
      </aside>

      {/* İçerik */}
      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  display: 'flex',
  height: '100vh',
  overflow: 'hidden',
};

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
  width: 32,
  height: 32,
  borderRadius: 8,
  background: 'var(--color-primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  fontWeight: 700,
  color: '#fff',
};

const brandTextStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: '#f1f5f9',
};

const navStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  overflowY: 'auto',
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
  background: isActive ? 'var(--color-sidebar-active-bg)' : 'transparent',
  textDecoration: 'none',
  transition: 'background 0.15s',
  borderLeft: isActive ? '3px solid var(--color-sidebar-active)' : '3px solid transparent',
});

const sidebarFooterStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderTop: '1px solid rgba(255,255,255,0.06)',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const userInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const avatarStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  background: 'var(--color-primary)',
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

const mainStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  background: 'var(--color-bg)',
};
