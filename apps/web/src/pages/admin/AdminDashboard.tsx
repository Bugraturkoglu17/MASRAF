import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { formatDate } from './admin-format';
import { AdminPage, BoolBadge, RoleBadge, StatusBadge } from './admin-ui';

import { useAuth } from '@/features/auth/auth-context';
import { apiFetch } from '@/lib/api-client';

interface RecentUser {
  id: string;
  fullName: string;
  phone: string | null;
  role: string;
  status: string;
  profileCompleted: boolean;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  managers: { active: number; limit: number };
  profileIncomplete: number;
  firstLoginPending: number;
  recentUsers: RecentUser[];
}

export function AdminDashboard(): JSX.Element {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiFetch('/users/admin-stats'),
    refetchInterval: 30000,
  });

  const cards = [
    { label: 'Toplam Kullanıcı', value: stats?.totalUsers },
    { label: 'Aktif Kullanıcı', value: stats?.activeUsers },
    { label: 'Pasif Kullanıcı', value: stats?.inactiveUsers },
    {
      label: 'Yönetici',
      value: stats ? `${stats.managers.active} / ${stats.managers.limit}` : undefined,
    },
    { label: 'Profili Eksik Kullanıcı', value: stats?.profileIncomplete },
    { label: 'İlk Girişini Tamamlamayan', value: stats?.firstLoginPending },
  ];

  return (
    <AdminPage
      title="Kullanıcı Yönetimi Özeti"
      subtitle={`Merhaba ${user?.firstName ?? ''}, hesap ve yetki yönetimi buradan yapılır.`}
      actions={
        <Link to="/admin/users/new" className="adm-btn adm-btn-primary">
          + Yeni Kullanıcı
        </Link>
      }
    >
      <div className="adm-stat-grid">
        {cards.map((card) => (
          <div key={card.label} className="adm-stat-card">
            <span className="adm-stat-value">{isLoading ? '…' : (card.value ?? '—')}</span>
            <span className="adm-stat-label">{card.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="adm-section-title">Son Eklenen Kullanıcılar</h2>
        <Link to="/admin/users" style={{ fontSize: 13, color: 'var(--color-primary)' }}>
          Tümünü gör →
        </Link>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>Telefon</th>
              <th>Rol</th>
              <th>Hesap Durumu</th>
              <th>Profil Durumu</th>
              <th>Eklenme Tarihi</th>
            </tr>
          </thead>
          <tbody>
            {stats?.recentUsers.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="adm-empty">Henüz kullanıcı yok.</div>
                </td>
              </tr>
            )}
            {stats?.recentUsers.map((u) => (
              <tr key={u.id}>
                <td>
                  <Link
                    to={`/admin/users/${u.id}`}
                    style={{ color: 'var(--color-text)', fontWeight: 600 }}
                  >
                    {u.fullName}
                  </Link>
                </td>
                <td>{u.phone ?? '—'}</td>
                <td>
                  <RoleBadge role={u.role} />
                </td>
                <td>
                  <StatusBadge status={u.status} />
                </td>
                <td>
                  <BoolBadge value={u.profileCompleted} yes="Tamamlandı" no="Eksik" />
                </td>
                <td>{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="adm-cards">
        {stats?.recentUsers.length === 0 && <div className="adm-empty">Henüz kullanıcı yok.</div>}
        {stats?.recentUsers.map((u) => (
          <Link
            key={u.id}
            to={`/admin/users/${u.id}`}
            className="adm-user-card"
            style={{ textDecoration: 'none' }}
          >
            <div className="adm-user-card-head">
              <span className="adm-user-card-name">{u.fullName}</span>
              <StatusBadge status={u.status} />
            </div>
            <div className="adm-user-card-row">
              <span className="k">Telefon</span>
              <span className="v">{u.phone ?? '—'}</span>
            </div>
            <div className="adm-user-card-row">
              <span className="k">Rol</span>
              <span className="v">
                <RoleBadge role={u.role} />
              </span>
            </div>
            <div className="adm-user-card-row">
              <span className="k">Profil</span>
              <span className="v">
                <BoolBadge value={u.profileCompleted} yes="Tamamlandı" no="Eksik" />
              </span>
            </div>
            <div className="adm-user-card-row">
              <span className="k">Eklenme</span>
              <span className="v">{formatDate(u.createdAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </AdminPage>
  );
}
