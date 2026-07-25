import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { AUDIT_ACTION_LABELS, formatDate, formatDateTime } from './admin-format';
import { AdminPage, BoolBadge, RoleBadge, StatusBadge } from './admin-ui';
import { UserActionsMenu, type AdminUser } from './AdminUsersPage';

import { useToast } from '@/components/feedback/toast-context';
import { IbanCopyButton } from '@/components/ui/IbanCopyButton';
import { TurkeyIbanInput } from '@/components/ui/TurkeyIbanInput';
import { apiFetch, getApiErrorMessage } from '@/lib/api-client';

interface AuditItem {
  id: string;
  action: string;
  resource: string;
  createdAt: string;
  actor: { firstName: string; lastName: string; email: string } | null;
}

function getDefaultJobTitle(role: AdminUser['role']): string {
  return role === 'MANAGER' ? 'Yönetici' : role === 'ADMIN' ? 'Admin' : 'Kullanıcı';
}

export function AdminUserDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const editing = searchParams.get('edit') === '1';
  const showHistory = searchParams.get('tab') === 'history';

  const { data: user, isLoading } = useQuery<AdminUser>({
    queryKey: ['admin', 'user', id],
    queryFn: () => apiFetch(`/users/${id}`),
    enabled: Boolean(id),
  });

  const { data: history } = useQuery<{ items: AuditItem[] }>({
    queryKey: ['admin', 'user-audit', id],
    queryFn: () => apiFetch(`/users/${id}/audit-logs?pageSize=30`),
    enabled: Boolean(id) && showHistory,
  });

  if (isLoading || !user) {
    return (
      <AdminPage title="Kullanıcı Detayı">
        <div className="adm-empty">{isLoading ? 'Yükleniyor…' : 'Kullanıcı bulunamadı.'}</div>
      </AdminPage>
    );
  }

  const emailShown = user.email.endsWith('@masraf.local') ? '—' : user.email;

  return (
    <AdminPage
      title={`${user.firstName} ${user.lastName}`}
      subtitle="Kullanıcı detayları ve güvenlik bilgileri"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to="/admin/users" className="adm-btn adm-btn-outline adm-btn-sm">
            ← Kullanıcılar
          </Link>
          <UserActionsMenu user={user} />
        </div>
      }
    >
      {editing && <EditUserForm key={user.id} user={user} onDone={() => setSearchParams({})} />}

      {!editing && (
        <div className="adm-detail-grid">
          <section className="adm-card">
            <h2 className="adm-section-title">Hesap Bilgileri</h2>
            <div className="adm-detail-row">
              <span className="k">Ad</span>
              <span className="v">{user.firstName}</span>
            </div>
            <div className="adm-detail-row">
              <span className="k">Soyad</span>
              <span className="v">{user.lastName}</span>
            </div>
            <div className="adm-detail-row">
              <span className="k">Telefon</span>
              <span className="v">{user.phone ?? '—'}</span>
            </div>
            <div className="adm-detail-row">
              <span className="k">E-posta</span>
              <span className="v">{emailShown}</span>
            </div>
            <div className="adm-detail-row">
              <span className="k">Rol</span>
              <span className="v">
                <RoleBadge role={user.role} />
              </span>
            </div>
            <div className="adm-detail-row">
              <span className="k">Durum</span>
              <span className="v">
                <StatusBadge status={user.status} />
              </span>
            </div>
          </section>

          <section className="adm-card">
            <h2 className="adm-section-title">Profil Bilgileri</h2>
            {user.role === 'USER' && (
              <div className="adm-detail-row">
                <span className="k">IBAN</span>
                <span
                  className="v"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  {user.iban ?? '—'}
                  <IbanCopyButton value={user.iban} />
                </span>
              </div>
            )}
            <div className="adm-detail-row">
              <span className="k">Görev / Unvan</span>
              <span className="v">{getDefaultJobTitle(user.role)}</span>
            </div>
            <div className="adm-detail-row">
              <span className="k">Profil Durumu</span>
              <span className="v">
                <BoolBadge value={user.profileCompleted} yes="Tamamlandı" no="Eksik" />
              </span>
            </div>
          </section>

          <section className="adm-card">
            <h2 className="adm-section-title">Güvenlik Bilgileri</h2>
            <div className="adm-detail-row">
              <span className="k">Şifre Durumu</span>
              <span className="v">
                <BoolBadge
                  value={user.mustChangePassword}
                  yes="Geçici şifre kullanıyor"
                  no="Şifre değiştirildi"
                  invert
                />
              </span>
            </div>
            <div className="adm-detail-row">
              <span className="k">Şifre Son Değiştirilme</span>
              <span className="v">{formatDateTime(user.passwordChangedAt)}</span>
            </div>
            <div className="adm-detail-row">
              <span className="k">Son Giriş</span>
              <span className="v">{formatDateTime(user.lastLoginAt)}</span>
            </div>
            <div className="adm-detail-row">
              <span className="k">Kayıt Tarihi</span>
              <span className="v">{formatDate(user.createdAt)}</span>
            </div>
          </section>

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
                İşlem Geçmişi
              </h2>
              {!showHistory && (
                <button
                  className="adm-btn adm-btn-outline adm-btn-sm"
                  onClick={() => setSearchParams({ tab: 'history' })}
                >
                  Göster
                </button>
              )}
            </div>
            {showHistory &&
              (history?.items.length ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {history.items.map((item) => (
                    <div key={item.id} className="adm-detail-row">
                      <span className="k">{formatDateTime(item.createdAt)}</span>
                      <span className="v">
                        {AUDIT_ACTION_LABELS[item.action] ?? item.action}
                        {item.actor ? ` — ${item.actor.firstName} ${item.actor.lastName}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="adm-empty">Kayıt bulunamadı.</div>
              ))}
          </section>
        </div>
      )}
    </AdminPage>
  );
}

function EditUserForm({ user, onDone }: { user: AdminUser; onDone: () => void }): JSX.Element {
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? '',
    email: user.email.endsWith('@masraf.local') ? '' : user.email,
    iban: user.iban ?? '',
    jobTitle: getDefaultJobTitle(user.role),
  });
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: () => {
      const body: Record<string, string | null> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      };
      if (user.role === 'USER') body.iban = form.iban.trim() || null;
      if (form.phone.trim()) body.phone = form.phone.trim();
      if (form.email.trim()) body.email = form.email.trim();
      return apiFetch(`/users/${user.id}`, { method: 'PATCH', body });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      showToast('Kullanıcı bilgileri güncellendi.', 'success');
      onDone();
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Güncelleme başarısız.'), 'error'),
  });

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const allFields: Array<{ key: keyof typeof form; label: string; type?: string }> = [
    { key: 'firstName', label: 'Ad' },
    { key: 'lastName', label: 'Soyad' },
    { key: 'phone', label: 'Telefon', type: 'tel' },
    { key: 'email', label: 'E-posta', type: 'email' },
    { key: 'iban', label: 'IBAN' },
    { key: 'jobTitle', label: 'Görev / Unvan' },
  ];
  const fields = allFields.filter((field) => user.role === 'USER' || field.key !== 'iban');

  return (
    <form
      className="adm-card"
      style={{ maxWidth: 560, marginBottom: 20 }}
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <h2 className="adm-section-title">Bilgileri Düzenle</h2>
      {fields.map((f) => (
        <div key={f.key} className="adm-field">
          <label className="adm-label" htmlFor={`edit-${f.key}`}>
            {f.label}
          </label>
          {f.key === 'iban' ? (
            <TurkeyIbanInput
              id={`edit-${f.key}`}
              className="adm-input"
              aria-label="IBAN"
              value={form.iban}
              onChange={(value) => set('iban', value)}
              placeholder="TR000000000000000000000000"
            />
          ) : (
            <input
              id={`edit-${f.key}`}
              className="adm-input"
              type={f.type ?? 'text'}
              value={form[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              readOnly={f.key === 'jobTitle'}
              aria-readonly={f.key === 'jobTitle'}
              style={f.key === 'jobTitle' ? { cursor: 'not-allowed', opacity: 0.68 } : undefined}
            />
          )}
          {f.key === 'jobTitle' && (
            <p className="adm-help">Role göre otomatik belirlenir ve değiştirilemez.</p>
          )}
          {f.key === 'iban' && (
            <p className="adm-help" style={{ textAlign: 'right' }}>
              TR sonrası {form.iban.replace(/\D/g, '').length}/24 rakam
            </p>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="adm-btn adm-btn-outline" onClick={onDone}>
          Vazgeç
        </button>
        <button
          type="submit"
          className="adm-btn adm-btn-primary"
          disabled={mutation.isPending}
          style={{ flex: 1 }}
        >
          {mutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
