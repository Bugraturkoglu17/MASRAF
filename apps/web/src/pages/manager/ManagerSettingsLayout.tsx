import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/manager/settings/profile', label: 'Profilim' },
  { to: '/manager/settings/users', label: 'Kullanıcılar' },
];

export function ManagerSettingsLayout(): JSX.Element {
  return (
    <div>
      <div style={tabBarStyle}>
        {tabs.map(({ to, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => tabLinkStyle(isActive)}>
            {label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 0,
  borderBottom: '1px solid var(--color-border, #e2e8f0)',
  padding: '0 24px',
  background: 'var(--color-bg)',
  position: 'sticky',
  top: 0,
  zIndex: 10,
};

const tabLinkStyle = (isActive: boolean): React.CSSProperties => ({
  padding: '14px 20px',
  fontSize: 14,
  fontWeight: isActive ? 600 : 500,
  color: isActive ? 'var(--color-primary, #1e3a8a)' : 'var(--color-text-muted, #64748b)',
  borderBottom: isActive ? '2px solid var(--color-primary, #1e3a8a)' : '2px solid transparent',
  textDecoration: 'none',
  marginBottom: -1,
  transition: 'color 0.15s, border-color 0.15s',
  whiteSpace: 'nowrap',
});
