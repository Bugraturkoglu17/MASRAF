import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import {
  AdminPage,
  AUDIT_ACTION_LABELS,
  BoolBadge,
  formatDate,
  formatDateTime,
  RoleBadge,
  StatusBadge,
} from './admin-ui';
import { UserActionsMenu, type AdminUser } from './AdminUsersPage';

import { useToast } from '@/components/feedback/toast-context';
import { apiFetch, getApiErrorMessage } from '@/lib/api-client';


interface AuditItem {
  id: string;
  action: string;
  resource: string;
  createdAt: string;
  actor: { firstName: string; lastName: string; email: string } | null;
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
            <div className="adm-detail-row">
              <span className="k">IBAN</span>
              <span className="v">{user.iban ?? '—'}</span>
            </div>
            <div className="adm-detail-row">
              <span className="k">Firma</span>
              <span className="v">{user.company ?? '—'}</span>
            </div>
            <div className="adm-detail-row">
              <span className="k">Görev / Unvan</span>
              <span className="v">{user.jobTitle ?? '—'}</span>
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
    company: user.company ?? '',
    jobTitle: user.jobTitle ?? '',
  });
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: () => {
      const body: Record<string, string | null> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        iban: form.iban.trim() || null,
        company: form.company.trim() || null,
        jobTitle: form.jobTitle.trim() || null,
      };
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

  const fields: Array<{ key: keyof typeof form; label: string; type?: string }> = [
    { key: 'firstName', label: 'Ad' },
    { key: 'lastName', label: 'Soyad' },
    { key: 'phone', label: 'Telefon', type: 'tel' },
    { key: 'email', label: 'E-posta', type: 'email' },
    { key: 'iban', label: 'IBAN' },
    { key: 'company', label: 'Firma' },
    { key: 'jobTitle', label: 'Görev / Unvan' },
  ];

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
          <input
            id={`edit-${f.key}`}
            className="adm-input"
            type={f.type ?? 'text'}
            value={form[f.key]}
            onChange={(e) => set(f.key, e.target.value)}
          />
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
