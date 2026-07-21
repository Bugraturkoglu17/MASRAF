import {
  Bell,
  CheckCircle2,
  Clock3,
  Home,
  Menu,
  ReceiptText,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { QuickExpenseActionMenu } from '@/components/expenses/QuickExpenseActionMenu';
import type { AppRole } from '@/features/auth/auth-context';

type NavItem = { to: string; label: string; icon: typeof Home; end?: boolean };

const itemsByRole: Record<Exclude<AppRole, 'USER'>, NavItem[]> = {
  MANAGER: [
    { to: '/manager', label: 'Ana Sayfa', icon: Home, end: true },
    { to: '/manager/pending', label: 'Bekleyen', icon: Clock3 },
    { to: '/manager/notifications', label: 'Bildirimler', icon: Bell },
    { to: '/manager/profile', label: 'Ayarlar', icon: Settings },
  ],
  ADMIN: [
    { to: '/admin', label: 'Ana Sayfa', icon: Home, end: true },
    { to: '/admin/users', label: 'Kullanıcılar', icon: Users },
    { to: '/admin/audit-logs', label: 'Denetim', icon: ReceiptText },
    { to: '/admin/notifications', label: 'Bildirimler', icon: Bell },
  ],
};

const userItems: NavItem[] = [
  { to: '/', label: 'Ana Sayfa', icon: Home, end: true },
  { to: '/expenses', label: 'Masraflarım', icon: ReceiptText },
  { to: '/approvals', label: 'Onaylar', icon: CheckCircle2 },
  { to: '/profile', label: 'Ayarlar', icon: Settings },
];

export function MobileBottomNavigation({
  role,
  unreadCount = 0,
}: {
  role: AppRole;
  unreadCount?: number;
}): JSX.Element {
  const navigate = useNavigate();
  const [quickOpen, setQuickOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  useEffect(() => {
    if (!quickOpen && !adminMenuOpen) return;
    const close = (event: KeyboardEvent) =>
      event.key === 'Escape' && (setQuickOpen(false), setAdminMenuOpen(false));
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [quickOpen, adminMenuOpen]);

  if (role === 'USER') {
    return (
      <>
        <QuickExpenseActionMenu open={quickOpen} onClose={() => setQuickOpen(false)} />
        <nav
          className="mobile-bottom-nav mobile-bottom-nav--user"
          aria-label="Mobil ana navigasyon"
        >
          <NavigationItem item={userItems[0]!} unreadCount={unreadCount} />
          <NavigationItem item={userItems[1]!} unreadCount={unreadCount} />
          <button
            type="button"
            className={`mobile-quick-action ${quickOpen ? 'is-open' : ''}`}
            aria-label={quickOpen ? 'Masraf menüsünü kapat' : 'Yeni masraf ekle'}
            aria-expanded={quickOpen}
            onClick={() => setQuickOpen((value) => !value)}
          >
            <span>{quickOpen ? <X aria-hidden="true" /> : '+'}</span>
          </button>
          <NavigationItem item={userItems[2]!} unreadCount={unreadCount} />
          <NavigationItem item={userItems[3]!} unreadCount={unreadCount} />
        </nav>
      </>
    );
  }

  const items = itemsByRole[role];
  return (
    <>
      {adminMenuOpen && (
        <div
          className="mobile-action-backdrop"
          role="presentation"
          onMouseDown={() => setAdminMenuOpen(false)}
        >
          <section
            className="mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Yönetim menüsü"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mobile-sheet-handle" />
            <h2>Yönetim menüsü</h2>
            <button
              type="button"
              onClick={() => {
                setAdminMenuOpen(false);
                navigate('/admin/profile');
              }}
            >
              <Settings /> Profil ve ayarlar
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminMenuOpen(false);
                navigate('/');
              }}
            >
              <Home /> Kullanıcı görünümü
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminMenuOpen(false);
                navigate('/manager');
              }}
            >
              <Clock3 /> Yönetici görünümü
            </button>
            <button
              type="button"
              className="mobile-sheet-cancel"
              onClick={() => setAdminMenuOpen(false)}
            >
              Kapat
            </button>
          </section>
        </div>
      )}
      <nav
        className={`mobile-bottom-nav mobile-bottom-nav--${role.toLowerCase()}`}
        aria-label="Mobil ana navigasyon"
      >
        {items.map((item) => (
          <NavigationItem key={item.to} item={item} unreadCount={unreadCount} />
        ))}
        {role === 'ADMIN' && (
          <button
            type="button"
            className={adminMenuOpen ? 'active' : ''}
            onClick={() => setAdminMenuOpen(true)}
            aria-haspopup="dialog"
          >
            <span className="mobile-nav-icon">
              <Menu aria-hidden="true" />
            </span>
            <span>Menü</span>
          </button>
        )}
      </nav>
    </>
  );
}

function NavigationItem({ item, unreadCount }: { item: NavItem; unreadCount: number }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => (isActive ? 'active' : undefined)}
    >
      <span className="mobile-nav-icon">
        <Icon aria-hidden="true" />
        {item.label === 'Bildirimler' && unreadCount > 0 && (
          <span className="mobile-nav-badge">{Math.min(unreadCount, 99)}</span>
        )}
      </span>
      <span>{item.label}</span>
    </NavLink>
  );
}
