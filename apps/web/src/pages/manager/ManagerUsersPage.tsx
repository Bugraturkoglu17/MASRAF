import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiFetch } from '@/lib/api-client';
import { BoolBadge, AdminPage, RoleBadge, StatusBadge } from '@/pages/admin/admin-ui';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: 'USER' | 'MANAGER' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
  profileCompleted: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export function ManagerUsersPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const params = new URLSearchParams();
  if (debouncedSearch) params.set('search', debouncedSearch);
  if (roleFilter) params.set('role', roleFilter);
  if (statusFilter) params.set('status', statusFilter);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['manager', 'users', params.toString()],
    queryFn: () => apiFetch(`/users?${params.toString()}`),
  });

  return (
    <AdminPage
      title="Kullanıcılar"
      subtitle="Tüm hesapları görüntüle ve yeni kullanıcı ekle."
      actions={
        <Link to="/manager/settings/users/new" className="adm-btn adm-btn-primary">
          + Yeni Kullanıcı
        </Link>
      }
    >
      <div className="adm-filters">
        <div>
          <label className="adm-label" htmlFor="mu-search">
            Ara
          </label>
          <input
            id="mu-search"
            className="adm-input"
            placeholder="Ad, soyad veya telefon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="adm-label" htmlFor="mu-role">
            Rol
          </label>
          <select
            id="mu-role"
            className="adm-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Tümü</option>
            <option value="USER">Kullanıcı</option>
            <option value="MANAGER">Yönetici</option>
          </select>
        </div>
        <div>
          <label className="adm-label" htmlFor="mu-status">
            Durum
          </label>
          <select
            id="mu-status"
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tümü</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Pasif</option>
          </select>
        </div>
      </div>

      {isLoading && <div className="adm-empty">Yükleniyor…</div>}
      {!isLoading && users.length === 0 && (
        <div className="adm-empty">Filtrelere uyan kullanıcı bulunamadı.</div>
      )}

      {users.length > 0 && (
        <>
          {/* Masaüstü tablo */}
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Ad Soyad</th>
                  <th>Telefon</th>
                  <th>E-posta</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th>Profil</th>
                  <th>İlk Giriş</th>
                  <th>Kayıt</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>
                      {u.firstName} {u.lastName}
                    </td>
                    <td>{u.phone ?? '—'}</td>
                    <td>{u.email || '—'}</td>
                    <td>
                      <RoleBadge role={u.role} />
                    </td>
                    <td>
                      <StatusBadge status={u.status} />
                    </td>
                    <td>
                      <BoolBadge value={u.profileCompleted} yes="Tamamlandı" no="Eksik" />
                    </td>
                    <td>
                      <BoolBadge value={u.mustChangePassword} yes="Bekliyor" no="Yapıldı" invert />
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString('tr-TR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobil kartlar */}
          <div className="adm-cards">
            {users.map((u) => (
              <div key={u.id} className="adm-user-card">
                <div className="adm-user-card-head">
                  <span className="adm-user-card-name">
                    {u.firstName} {u.lastName}
                  </span>
                  <RoleBadge role={u.role} />
                </div>
                <div className="adm-user-card-row">
                  <span className="k">Telefon</span>
                  <span className="v">{u.phone ?? '—'}</span>
                </div>
                <div className="adm-user-card-row">
                  <span className="k">Durum</span>
                  <span className="v">
                    <StatusBadge status={u.status} />
                  </span>
                </div>
                <div className="adm-user-card-row">
                  <span className="k">Profil</span>
                  <span className="v">
                    <BoolBadge value={u.profileCompleted} yes="Tamamlandı" no="Eksik" />
                  </span>
                </div>
                <div className="adm-user-card-row">
                  <span className="k">Kayıt</span>
                  <span className="v">{new Date(u.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminPage>
  );
}
