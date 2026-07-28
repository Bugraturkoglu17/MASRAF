import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreVertical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';

import { formatDate } from './admin-format';
import { AdminPage, BoolBadge, RoleBadge, StatusBadge } from './admin-ui';

import { useToast } from '@/components/feedback/toast-context';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch, getApiErrorMessage } from '@/lib/api-client';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  iban: string | null;
  jobTitle: string | null;
  role: 'USER' | 'MANAGER' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
  profileCompleted: boolean;
  mustChangePassword: boolean;
  passwordChangedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

type QuickFilter = '' | 'PROFILE_INCOMPLETE' | 'FIRST_LOGIN_PENDING';

function getDefaultJobTitle(role: AdminUser['role']): string {
  return role === 'MANAGER' ? 'Yönetici' : role === 'ADMIN' ? 'Admin' : 'Kullanıcı';
}

export function AdminUsersPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const params = new URLSearchParams();
  if (debouncedSearch) params.set('search', debouncedSearch);
  if (roleFilter) params.set('role', roleFilter);
  if (statusFilter) params.set('status', statusFilter);
  if (quickFilter === 'PROFILE_INCOMPLETE') params.set('profileCompleted', 'false');
  if (quickFilter === 'FIRST_LOGIN_PENDING') params.set('mustChangePassword', 'true');

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin', 'users', params.toString()],
    queryFn: () => apiFetch(`/users?${params.toString()}`),
  });

  return (
    <AdminPage
      title="Kullanıcılar"
      subtitle="Tüm hesapları görüntüle, düzenle ve yönet."
      actions={
        <Link to="/admin/users/new" className="adm-btn adm-btn-primary">
          + Yeni Kullanıcı
        </Link>
      }
    >
      <div className="adm-filters">
        <div>
          <label className="adm-label" htmlFor="user-search">
            Ara
          </label>
          <input
            id="user-search"
            className="adm-input"
            placeholder="Ad, soyad veya telefon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="adm-label" htmlFor="role-filter">
            Rol
          </label>
          <select
            id="role-filter"
            className="adm-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Tümü</option>
            <option value="USER">Kullanıcı</option>
            <option value="MANAGER">Yönetici</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div>
          <label className="adm-label" htmlFor="status-filter">
            Durum
          </label>
          <select
            id="status-filter"
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tümü</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Pasif</option>
          </select>
        </div>
        <div>
          <label className="adm-label" htmlFor="quick-filter">
            Hızlı Filtre
          </label>
          <select
            id="quick-filter"
            className="adm-select"
            value={quickFilter}
            onChange={(e) => setQuickFilter(e.target.value as QuickFilter)}
          >
            <option value="">Yok</option>
            <option value="PROFILE_INCOMPLETE">Profili eksik olanlar</option>
            <option value="FIRST_LOGIN_PENDING">İlk girişini tamamlamayanlar</option>
          </select>
        </div>
      </div>

      {isLoading && <div className="adm-empty">Yükleniyor…</div>}
      {!isLoading && users.length === 0 && (
        <div className="adm-empty">Filtrelere uyan kullanıcı bulunamadı.</div>
      )}

      {users.length > 0 && (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Telefon</th>
                <th>E-posta</th>
                <th>Rol</th>
                <th>Görev</th>
                <th>Durum</th>
                <th>Profil</th>
                <th>Şifre</th>
                <th>Son Giriş</th>
                <th>Kayıt</th>
                <th aria-label="İşlemler" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link
                      to={`/admin/users/${u.id}`}
                      style={{ color: 'var(--color-text)', fontWeight: 600 }}
                    >
                      {u.firstName} {u.lastName}
                    </Link>
                  </td>
                  <td>{u.phone ?? '—'}</td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.email.endsWith('@masraf.local') ? '—' : u.email}
                  </td>
                  <td>
                    <RoleBadge role={u.role} />
                  </td>
                  <td>{getDefaultJobTitle(u.role)}</td>
                  <td>
                    <StatusBadge status={u.status} />
                  </td>
                  <td>
                    <BoolBadge value={u.profileCompleted} yes="Tamam" no="Eksik" />
                  </td>
                  <td>
                    <BoolBadge value={u.mustChangePassword} yes="Geçici" no="Değiştirildi" invert />
                  </td>
                  <td>{formatDate(u.lastLoginAt)}</td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>
                    <UserActionsMenu user={u} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="adm-cards">
        {users.map((u) => (
          <div key={u.id} className="adm-user-card">
            <div className="adm-user-card-head">
              <Link
                to={`/admin/users/${u.id}`}
                className="adm-user-card-name"
                style={{ textDecoration: 'none' }}
              >
                {u.firstName} {u.lastName}
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StatusBadge status={u.status} />
                <UserActionsMenu user={u} />
              </div>
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
              <span className="k">Şifre</span>
              <span className="v">
                <BoolBadge
                  value={u.mustChangePassword}
                  yes="Geçici şifre"
                  no="Değiştirildi"
                  invert
                />
              </span>
            </div>
            <div className="adm-user-card-row">
              <span className="k">Son Giriş</span>
              <span className="v">{formatDate(u.lastLoginAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </AdminPage>
  );
}

// ---------------------------------------------------------------------------
// Kullanıcı işlem menüsü — Kullanıcılar listesi ve Detay sayfasında ortak
// ---------------------------------------------------------------------------
export function UserActionsMenu({ user }: { user: AdminUser }): JSX.Element {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<'role' | 'password' | 'delete' | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user: me } = useAuth();

  const MENU_WIDTH = 200;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const closeMenu = () => setOpen(false);
    document.addEventListener('mousedown', onClick);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [open]);

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.min(
        Math.max(8, rect.right - MENU_WIDTH),
        window.innerWidth - MENU_WIDTH - 8,
      );
      setMenuPos({ top: rect.bottom + 4, left });
    }
    setOpen((v) => !v);
  };

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin'] });

  const statusMutation = useMutation({
    mutationFn: (status: 'ACTIVE' | 'INACTIVE') =>
      apiFetch(`/users/${user.id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      invalidate();
      showToast(
        user.status === 'ACTIVE' ? 'Kullanıcı pasif edildi.' : 'Kullanıcı aktif edildi.',
        'success',
      );
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'İşlem başarısız.'), 'error'),
  });

  const revokeMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ message?: string }>(`/users/${user.id}/revoke-sessions`, { method: 'POST' }),
    onSuccess: (res: { message?: string }) => {
      invalidate();
      showToast(res.message ?? 'Oturumlar kapatıldı.', 'success');
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'İşlem başarısız.'), 'error'),
  });

  const isSelf = user.id === me?.id;
  const isActive = user.status === 'ACTIVE';

  const items: Array<{ label: string; onClick: () => void; danger?: boolean; disabled?: boolean }> =
    [
      { label: 'Detayları Gör', onClick: () => navigate(`/admin/users/${user.id}`) },
      { label: 'Bilgileri Düzenle', onClick: () => navigate(`/admin/users/${user.id}?edit=1`) },
      { label: 'Rol Değiştir', onClick: () => setModal('role'), disabled: isSelf },
      isActive
        ? {
            label: 'Pasif Yap',
            onClick: () => statusMutation.mutate('INACTIVE'),
            danger: true,
            disabled: isSelf,
          }
        : { label: 'Aktif Yap', onClick: () => statusMutation.mutate('ACTIVE') },
      { label: 'Geçici Şifre Oluştur', onClick: () => setModal('password') },
      { label: 'Tüm Oturumları Kapat', onClick: () => revokeMutation.mutate(), danger: true },
      { label: 'İşlem Geçmişi', onClick: () => navigate(`/admin/users/${user.id}?tab=history`) },
      {
        label: 'Kullanıcıyı Sil',
        onClick: () => setModal('delete'),
        danger: true,
        disabled: isSelf,
      },
    ];

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        ref={buttonRef}
        type="button"
        className="adm-btn adm-btn-outline adm-btn-sm"
        aria-label="Kullanıcı işlemleri"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={openMenu}
        style={{ padding: 6 }}
      >
        <MoreVertical size={16} />
      </button>
      {open &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
              zIndex: 1500,
              width: MENU_WIDTH,
              overflow: 'hidden',
            }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: 13,
                  color: item.disabled
                    ? 'var(--color-text-muted)'
                    : item.danger
                      ? '#f87171'
                      : 'var(--color-text)',
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
      {modal === 'role' &&
        createPortal(<ChangeRoleModal user={user} onClose={() => setModal(null)} />, document.body)}
      {modal === 'password' &&
        createPortal(
          <TempPasswordModal user={user} onClose={() => setModal(null)} />,
          document.body,
        )}
      {modal === 'delete' &&
        createPortal(<DeleteUserModal user={user} onClose={() => setModal(null)} />, document.body)}
    </div>
  );
}

function ChangeRoleModal({ user, onClose }: { user: AdminUser; onClose: () => void }): JSX.Element {
  const [role, setRole] = useState(user.role);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: () => apiFetch(`/users/${user.id}/role`, { method: 'PATCH', body: { role } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      showToast('Kullanıcı rolü güncellendi.', 'success');
      onClose();
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Rol değiştirilemedi.'), 'error'),
  });

  return (
    <div className="adm-modal-backdrop" onClick={onClose}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="adm-modal-title">
          Rol Değiştir — {user.firstName} {user.lastName}
        </h3>
        <div className="adm-field">
          <label className="adm-label" htmlFor="new-role">
            Yeni Rol
          </label>
          <select
            id="new-role"
            className="adm-select"
            value={role}
            onChange={(e) => setRole(e.target.value as AdminUser['role'])}
          >
            <option value="USER">Kullanıcı</option>
            <option value="MANAGER">Yönetici</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '8px 0 0' }}>
          Rol değişince kullanıcının açık oturumları kapatılır; yeniden giriş yapması gerekir.
        </p>
        <div className="adm-modal-actions">
          <button className="adm-btn adm-btn-outline" onClick={onClose}>
            Vazgeç
          </button>
          <button
            className="adm-btn adm-btn-primary"
            disabled={mutation.isPending || role === user.role}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteUserModal({ user, onClose }: { user: AdminUser; onClose: () => void }): JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: () => apiFetch(`/users/${user.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      showToast(`${user.firstName} ${user.lastName} silindi.`, 'success');
      onClose();
      navigate('/admin/users');
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Kullanıcı silinemedi.'), 'error'),
  });

  return (
    <div className="adm-modal-backdrop" onClick={onClose}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="adm-modal-title">
          Kullanıcıyı Sil — {user.firstName} {user.lastName}
        </h3>
        <p style={{ fontSize: 14, color: 'var(--color-text)', margin: '0 0 8px' }}>
          Bu işlem geri alınamaz. Kullanıcının tüm oturumları kapatılır ve sisteme girişi
          engellenir.
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
          Masraf kayıtları ve denetim geçmişi korunur.
        </p>
        <div className="adm-modal-actions">
          <button type="button" className="adm-btn adm-btn-outline" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className="adm-btn"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            style={{ background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
          >
            {mutation.isPending ? 'Siliniyor…' : 'Evet, Sil'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TempPasswordModal({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}): JSX.Element {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<{ message?: string }>(`/users/${user.id}/reset-password`, {
        method: 'POST',
        body: { newPassword: password, newPasswordConfirm: passwordConfirm },
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      showToast(
        res.message ??
          'Geçici şifre başarıyla oluşturuldu. Kullanıcı ilk girişte şifresini değiştirmek zorundadır.',
        'success',
      );
      onClose();
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Şifre sıfırlanamadı.'), 'error'),
  });

  const submit = () => {
    setLocalError(null);
    if (password.length < 8) {
      setLocalError('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (password !== passwordConfirm) {
      setLocalError('Şifreler eşleşmiyor. Aynı şifreyi iki kez girin.');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="adm-modal-backdrop" onClick={onClose}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="adm-modal-title">
          Geçici Şifre — {user.firstName} {user.lastName}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
          Mevcut şifre görüntülenemez. Yeni geçici şifre tanımlandığında kullanıcının tüm oturumları
          kapatılır ve ilk girişte şifre değiştirmesi zorunlu olur.
        </p>
        <div className="adm-field">
          <label className="adm-label" htmlFor="temp-pw">
            Geçici Şifre
          </label>
          <input
            id="temp-pw"
            type="password"
            className="adm-input"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="temp-pw2">
            Geçici Şifre (Tekrar)
          </label>
          <input
            id="temp-pw2"
            type="password"
            className="adm-input"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
        </div>
        {localError && <p className="adm-error">{localError}</p>}
        <div className="adm-modal-actions">
          <button className="adm-btn adm-btn-outline" onClick={onClose}>
            Vazgeç
          </button>
          <button
            className="adm-btn adm-btn-primary"
            disabled={mutation.isPending}
            onClick={submit}
          >
            {mutation.isPending ? 'Oluşturuluyor…' : 'Geçici Şifre Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}
