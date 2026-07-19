import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '@/features/auth/auth-context';

const NAV_ITEMS = [
  { to: '/', label: 'Ana Sayfa', icon: '🏠' },
  { to: '/expenses', label: 'Masraflarım', icon: '🧾' },
  { to: '/notifications', label: 'Bildirimler', icon: '🔔' },
  { to: '/profile', label: 'Profilim', icon: '👤' },
];

/**
 * Mobil: alt gezinme çubuğu. Masaüstü (>=768px): yan panel. Tek bir nav
 * listesinden türetilir; layout mantığı yalnızca CSS media query ile değişir.
 */
export function MainLayout(): JSX.Element {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Ana gezinme">
        <div className="sidebar-brand">Masraf Yönetim</div>
        <nav>
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  end={item.to === '/'}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">{user ? `${user.firstName} ${user.lastName}` : ''}</div>
          <button type="button" onClick={() => void logout()} className="logout-button">
            Çıkış yap
          </button>
        </div>
      </aside>

      <main className="content" id="main-content">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Mobil gezinme">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}
            end={item.to === '/'}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <style>{`
        .app-shell {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
        }
        .sidebar {
          display: none;
        }
        .content {
          flex: 1;
          padding: var(--space-4);
          padding-bottom: calc(72px + env(safe-area-inset-bottom));
        }
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-around;
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          padding: 8px max(8px, env(safe-area-inset-left)) max(8px, env(safe-area-inset-bottom));
        }
        .bottom-nav-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          font-size: 11px;
          color: var(--color-text-muted);
          text-decoration: none;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }
        .bottom-nav-link.active {
          color: var(--color-primary);
        }
        .nav-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          color: var(--color-text);
          text-decoration: none;
          font-size: 14px;
        }
        .nav-link.active {
          background: var(--color-primary);
          color: var(--color-primary-contrast);
        }
        .sidebar-brand {
          font-weight: 700;
          font-size: 16px;
          margin-bottom: var(--space-6);
        }
        .sidebar-footer {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .user-chip {
          font-size: 13px;
          color: var(--color-text-muted);
        }
        .logout-button {
          background: none;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          cursor: pointer;
          color: var(--color-text);
          font-size: 13px;
        }

        @media (min-width: 768px) {
          .app-shell {
            flex-direction: row;
          }
          .sidebar {
            display: flex;
            flex-direction: column;
            width: 240px;
            flex-shrink: 0;
            padding: var(--space-6) var(--space-4);
            border-right: 1px solid var(--color-border);
            background: var(--color-surface);
            position: sticky;
            top: 0;
            height: 100dvh;
          }
          .content {
            padding: var(--space-8);
            padding-bottom: var(--space-8);
          }
          .bottom-nav {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
