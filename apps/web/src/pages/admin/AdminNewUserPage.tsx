import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AdminPage } from './admin-ui';

import { useToast } from '@/components/feedback/toast-context';
import { apiFetch, getApiErrorMessage } from '@/lib/api-client';

interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  roleName: 'USER' | 'MANAGER';
  jobTitle: string;
  tempPassword: string;
  tempPasswordConfirm: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const initialForm: FormState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  roleName: 'USER',
  jobTitle: 'Kullanıcı',
  tempPassword: '',
  tempPasswordConfirm: '',
  status: 'ACTIVE',
};

export function AdminNewUserPage(): JSX.Element {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>('/users', {
        method: 'POST',
        body: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          roleName: form.roleName,
          tempPassword: form.tempPassword,
          status: form.status,
        },
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      showToast('Kullanıcı oluşturuldu. İlk girişte şifre değiştirmesi zorunludur.', 'success');
      navigate(`/admin/users/${res.id}`);
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Kullanıcı oluşturulamadı.'), 'error'),
  });

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.firstName.trim()) next.firstName = 'Ad zorunludur.';
    if (!form.lastName.trim()) next.lastName = 'Soyad zorunludur.';
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (!phoneDigits) next.phone = 'Telefon numarası zorunludur.';
    else if (!/^(90|0)?5\d{9}$/.test(phoneDigits))
      next.phone = 'Geçerli bir Türkiye mobil numarası girin (5XX XXX XX XX).';
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim()))
      next.email = 'Geçerli bir e-posta girin veya boş bırakın.';
    if (form.tempPassword.length < 8)
      next.tempPassword = 'Geçici şifre en az 8 karakter olmalıdır.';
    else if (form.tempPassword !== form.tempPasswordConfirm)
      next.tempPasswordConfirm = 'Şifreler eşleşmiyor.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) mutation.mutate();
  };

  return (
    <AdminPage
      title="Yeni Kullanıcı"
      subtitle="Kullanıcı ilk girişinde geçici şifresini değiştirmek zorundadır."
    >
      <form onSubmit={submit} noValidate className="adm-card" style={{ maxWidth: 560 }}>
        <div className="adm-field">
          <label className="adm-label" htmlFor="nu-firstname">
            Ad *
          </label>
          <input
            id="nu-firstname"
            className="adm-input"
            value={form.firstName}
            onChange={(e) => set('firstName', e.target.value)}
          />
          {errors.firstName && <p className="adm-error">{errors.firstName}</p>}
        </div>

        <div className="adm-field">
          <label className="adm-label" htmlFor="nu-lastname">
            Soyad *
          </label>
          <input
            id="nu-lastname"
            className="adm-input"
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
          />
          {errors.lastName && <p className="adm-error">{errors.lastName}</p>}
        </div>

        <div className="adm-field">
          <label className="adm-label" htmlFor="nu-phone">
            Telefon Numarası *
          </label>
          <input
            id="nu-phone"
            className="adm-input"
            type="tel"
            placeholder="05XX XXX XX XX"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
          {errors.phone && <p className="adm-error">{errors.phone}</p>}
        </div>

        <div className="adm-field">
          <label className="adm-label" htmlFor="nu-email">
            E-posta (isteğe bağlı)
          </label>
          <input
            id="nu-email"
            className="adm-input"
            type="email"
            placeholder="ornek@sirket.com"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
          {errors.email && <p className="adm-error">{errors.email}</p>}
        </div>

        <div className="adm-field">
          <label className="adm-label" htmlFor="nu-role">
            Rol *
          </label>
          <select
            id="nu-role"
            className="adm-select"
            value={form.roleName}
            onChange={(e) => {
              const role = e.target.value as FormState['roleName'];
              setForm((current) => ({
                ...current,
                roleName: role,
                jobTitle: role === 'MANAGER' ? 'Yönetici' : 'Kullanıcı',
              }));
            }}
          >
            <option value="USER">Kullanıcı</option>
            <option value="MANAGER">Yönetici (sistemde en fazla 1 aktif)</option>
          </select>
        </div>

        <div className="adm-field">
          <label className="adm-label" htmlFor="nu-job-title">
            Görev / Unvan *
          </label>
          <input
            id="nu-job-title"
            className="adm-input"
            value={form.jobTitle}
            readOnly
            aria-readonly="true"
            style={{ cursor: 'not-allowed', opacity: 0.68 }}
          />
          <p className="adm-help">Seçilen role göre otomatik belirlenir ve değiştirilemez.</p>
        </div>

        <div className="adm-field">
          <label className="adm-label" htmlFor="nu-password">
            Geçici Şifre *
          </label>
          <input
            id="nu-password"
            className="adm-input"
            type="password"
            autoComplete="new-password"
            value={form.tempPassword}
            onChange={(e) => set('tempPassword', e.target.value)}
          />
          {errors.tempPassword && <p className="adm-error">{errors.tempPassword}</p>}
        </div>

        <div className="adm-field">
          <label className="adm-label" htmlFor="nu-password2">
            Geçici Şifre (Tekrar) *
          </label>
          <input
            id="nu-password2"
            className="adm-input"
            type="password"
            autoComplete="new-password"
            value={form.tempPasswordConfirm}
            onChange={(e) => set('tempPasswordConfirm', e.target.value)}
          />
          {errors.tempPasswordConfirm && <p className="adm-error">{errors.tempPasswordConfirm}</p>}
        </div>

        <div className="adm-field">
          <label className="adm-label" htmlFor="nu-status">
            Hesap Durumu
          </label>
          <select
            id="nu-status"
            className="adm-select"
            value={form.status}
            onChange={(e) => set('status', e.target.value as FormState['status'])}
          >
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Pasif</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            type="button"
            className="adm-btn adm-btn-outline"
            onClick={() => navigate('/admin/users')}
          >
            Vazgeç
          </button>
          <button
            type="submit"
            className="adm-btn adm-btn-primary"
            disabled={mutation.isPending}
            style={{ flex: 1 }}
          >
            {mutation.isPending ? 'Oluşturuluyor…' : 'Kullanıcı Oluştur'}
          </button>
        </div>
      </form>
    </AdminPage>
  );
}
