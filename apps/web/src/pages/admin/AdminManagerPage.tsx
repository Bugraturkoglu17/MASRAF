import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';


import { AdminPage, BoolBadge, formatDateTime, StatusBadge } from './admin-ui';
import { UserActionsMenu, type AdminUser } from './AdminUsersPage';

import { apiFetch } from '@/lib/api-client';

interface ManagerResponse {
  manager: AdminUser | null;
  others: AdminUser[];
  activeSessionCounts: Record<string, number>;
}

export function AdminManagerPage(): JSX.Element {
  const { data, isLoading } = useQuery<ManagerResponse>({
    queryKey: ['admin', 'manager-account'],
    queryFn: () => apiFetch('/users/manager-account'),
  });

  const manager = data?.manager ?? null;
  const sessions = manager ? (data?.activeSessionCounts[manager.id] ?? 0) : 0;

  return (
    <AdminPage
      title="Yönetici Hesabı"
      subtitle="Sistemde yalnızca bir aktif yönetici (MANAGER) bulunabilir."
      actions={
        !isLoading && !manager ? (
          <Link to="/admin/users/new" className="adm-btn adm-btn-primary">
            + Yönetici Oluştur
          </Link>
        ) : undefined
      }
    >
      {isLoading && <div className="adm-empty">Yükleniyor…</div>}

      {!isLoading && !manager && (
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

      {manager && (
        <div className="adm-detail-grid">
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
                {manager.firstName} {manager.lastName}
              </h2>
              <UserActionsMenu user={manager} />
            </div>
            <div className="adm-detail-row">
              <span className="k">Telefon</span>
              <span className="v">{manager.phone ?? '—'}</span>
            </div>
            <div className="adm-detail-row">
              <span className="k">E-posta</span>
              <span className="v">
                {manager.email.endsWith('@masraf.local') ? '—' : manager.email}
              </span>
            </div>
            <div className="adm-detail-row">
              <span className="k">Hesap Durumu</span>
              <span className="v">
                <StatusBadge status={manager.status} />
              </span>
            </div>
            <div className="adm-detail-row">
              <span className="k">Son Giriş</span>
              <span className="v">{formatDateTime(manager.lastLoginAt)}</span>
            </div>
            <div className="adm-detail-row">
              <span className="k">Profil Durumu</span>
              <span className="v">
                <BoolBadge value={manager.profileCompleted} yes="Tamamlandı" no="Eksik" />
              </span>
            </div>
            <div className="adm-detail-row">
              <span className="k">Açık Oturum</span>
              <span className="v">{sessions > 0 ? `${sessions} oturum` : 'Yok'}</span>
            </div>
          </section>

          <section className="adm-card">
            <h2 className="adm-section-title">Yönetici İşlemleri</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 10px' }}>
              Sağ üstteki işlem menüsünden yönetici bilgilerini düzenleyebilir, geçici şifre
              verebilir, oturumlarını kapatabilir veya hesabı pasif yapabilirsiniz.
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
              İkinci bir aktif yönetici oluşturulmaya çalışıldığında sistem işlemi engeller.
            </p>
            {data && data.others.length > 0 && (
              <p style={{ fontSize: 13, color: '#fbbf24', marginTop: 12 }}>
                Uyarı: Sistemde {data.others.length} pasif yönetici hesabı daha var.
              </p>
            )}
          </section>
        </div>
      )}
    </AdminPage>
  );
}
