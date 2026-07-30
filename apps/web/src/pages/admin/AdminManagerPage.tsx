import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { formatDateTime } from './admin-format';
import { AdminPage, BoolBadge, StatusBadge } from './admin-ui';
import { UserActionsMenu, type AdminUser } from './AdminUsersPage';

import { apiFetch } from '@/lib/api-client';

interface ManagerResponse {
  manager: AdminUser | null;
  others: AdminUser[];
  activeSessionCounts: Record<string, number>;
}

function ManagerCard({ user, sessions }: { user: AdminUser; sessions: number }): JSX.Element {
  return (
    <div className="adm-detail-grid" style={{ marginBottom: 16 }}>
      <section className="adm-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <h2 className="adm-section-title" style={{ margin: 0 }}>
            {user.firstName} {user.lastName}
          </h2>
          <UserActionsMenu user={user} />
        </div>
        <div className="adm-detail-row">
          <span className="k">Telefon</span>
          <span className="v">{user.phone ?? '—'}</span>
        </div>
        <div className="adm-detail-row">
          <span className="k">E-posta</span>
          <span className="v">{user.email.endsWith('@masraf.local') ? '—' : user.email}</span>
        </div>
        <div className="adm-detail-row">
          <span className="k">Hesap Durumu</span>
          <span className="v">
            <StatusBadge status={user.status} />
          </span>
        </div>
        <div className="adm-detail-row">
          <span className="k">Son Giriş</span>
          <span className="v">{formatDateTime(user.lastLoginAt)}</span>
        </div>
        <div className="adm-detail-row">
          <span className="k">Profil Durumu</span>
          <span className="v">
            <BoolBadge value={user.profileCompleted} yes="Tamamlandı" no="Eksik" />
          </span>
        </div>
        <div className="adm-detail-row">
          <span className="k">Açık Oturum</span>
          <span className="v">{sessions > 0 ? `${sessions} oturum` : 'Yok'}</span>
        </div>
      </section>
    </div>
  );
}

export function AdminManagerPage(): JSX.Element {
  const { data, isLoading } = useQuery<ManagerResponse>({
    queryKey: ['admin', 'manager-account'],
    queryFn: () => apiFetch('/users/manager-account'),
  });

  const allManagers: AdminUser[] = [];
  if (data?.manager) allManagers.push(data.manager);
  if (data?.others) allManagers.push(...data.others);

  return (
    <AdminPage
      title="Yönetici Hesapları"
      subtitle="Sistemdeki tüm yöneticiler (MANAGER) burada listelenir. Birden fazla yönetici oluşturulabilir."
      actions={
        !isLoading ? (
          <Link to="/admin/users/new" className="adm-btn adm-btn-primary">
            + Yönetici Oluştur
          </Link>
        ) : undefined
      }
    >
      {isLoading && <div className="adm-empty">Yükleniyor…</div>}

      {!isLoading && allManagers.length === 0 && (
        <div className="adm-card">
          <div className="adm-empty">
            Sistemde tanımlı yönetici hesabı yok.
            <br />
            <span style={{ fontSize: 13 }}>
              Yeni Kullanıcı ekranından rolü &quot;Yönetici&quot; seçerek oluşturabilirsiniz.
            </span>
          </div>
        </div>
      )}

      {allManagers.map((mgr) => (
        <ManagerCard key={mgr.id} user={mgr} sessions={data?.activeSessionCounts[mgr.id] ?? 0} />
      ))}
    </AdminPage>
  );
}
