import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useToast } from '@/components/feedback/toast-context';
import { apiFetch, getApiErrorMessage } from '@/lib/api-client';
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
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

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

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      apiFetch(`/users/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['manager', 'users'] });
      showToast('Kullanıcı durumu güncellendi.', 'success');
    },
    onError: (err) => showToast(getApiErrorMessage(err), 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['manager', 'users'] });
      showToast('Kullanıcı silindi.', 'success');
      setDeleteTarget(null);
    },
    onError: (err) => {
      showToast(getApiErrorMessage(err), 'error');
      setDeleteTarget(null);
    },
  });

  return (
    <AdminPage
      title="Kullanıcılar"
      subtitle="Tüm hesapları görüntüle ve yönet."
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
                  <th></th>
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
                    <td>
                      {u.role !== 'ADMIN' && (
                        <UserActions
                          user={u}
                          busy={statusMut.isPending || deleteMut.isPending}
                          onToggleStatus={() =>
                            statusMut.mutate({
                              id: u.id,
                              status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                            })
                          }
                          onDelete={() => setDeleteTarget(u)}
                        />
                      )}
                    </td>
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
                {u.role !== 'ADMIN' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      className="adm-btn"
                      style={{ flex: 1, fontSize: 12 }}
                      disabled={statusMut.isPending}
                      onClick={() =>
                        statusMut.mutate({
                          id: u.id,
                          status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                        })
                      }
                    >
                      {u.status === 'ACTIVE' ? 'Pasif Yap' : 'Aktif Yap'}
                    </button>
                    <button
                      className="adm-btn adm-btn-danger"
                      style={{ flex: 1, fontSize: 12 }}
                      disabled={deleteMut.isPending}
                      onClick={() => setDeleteTarget(u)}
                    >
                      Sil
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Silme onay modalı */}
      {deleteTarget && (
        <DeleteConfirmModal
          user={deleteTarget}
          busy={deleteMut.isPending}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </AdminPage>
  );
}

function UserActions({
  user,
  busy,
  onToggleStatus,
  onDelete,
}: {
  user: User;
  busy: boolean;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
      <button
        className="adm-btn"
        style={{ fontSize: 12, padding: '4px 10px', whiteSpace: 'nowrap' }}
        disabled={busy}
        onClick={onToggleStatus}
      >
        {user.status === 'ACTIVE' ? 'Pasif Yap' : 'Aktif Yap'}
      </button>
      <button
        className="adm-btn adm-btn-danger"
        style={{ fontSize: 12, padding: '4px 10px' }}
        disabled={busy}
        onClick={onDelete}
      >
        Sil
      </button>
    </div>
  );
}

function DeleteConfirmModal({
  user,
  busy,
  onConfirm,
  onClose,
}: {
  user: User;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="decision-backdrop" onMouseDown={onClose}>
      <section
        role="alertdialog"
        aria-modal="true"
        className="decision-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="decision-symbol reject" />
        <h2>Kullanıcıyı Sil</h2>
        <p>
          <strong>
            {user.firstName} {user.lastName}
          </strong>{' '}
          adlı kullanıcı kalıcı olarak silinecek. Bu işlem geri alınamaz.
        </p>
        <div>
          <button type="button" onClick={onClose} disabled={busy}>
            Vazgeç
          </button>
          <button type="button" className="reject" disabled={busy} onClick={onConfirm}>
            {busy ? 'Siliniyor…' : 'Evet, Sil'}
          </button>
        </div>
      </section>
    </div>
  );
}
