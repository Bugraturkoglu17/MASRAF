import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { useToast } from '@/components/feedback/toast-context';
import { IbanCopyButton } from '@/components/ui/IbanCopyButton';
import { normalizeTurkeyIban } from '@/components/ui/turkey-iban';
import { TurkeyIbanInput } from '@/components/ui/TurkeyIbanInput';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch, getApiErrorMessage } from '@/lib/api-client';

const schema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur'),
  lastName: z.string().min(1, 'Soyad zorunludur'),
  phone: z.string().min(1, 'Telefon zorunludur'),
  iban: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const roleLabels: Record<string, string> = {
  USER: 'Kullanıcı',
  MANAGER: 'Yönetici',
  ADMIN: 'Admin',
};

export function UserProfilePage(): JSX.Element {
  const { user, refreshUser, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
      showToast('Oturum kapatıldı.', 'info');
    } finally {
      setLoggingOut(false);
    }
  };

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
      iban: user?.iban ?? '',
    },
  });

  const isUser = user?.role === 'USER';
  const ibanValue = useWatch({ control, name: 'iban' });
  const ibanDigitCount = (ibanValue ?? '').replace(/\D/g, '').length;

  const onSubmit = handleSubmit(async (values) => {
    const normalizedIban = normalizeTurkeyIban(values.iban ?? '');
    if (isUser && !/^TR\d{24}$/.test(normalizedIban)) {
      setError('iban', { message: 'IBAN, TR ile birlikte 26 karakter olmalıdır.' });
      return;
    }

    try {
      const payload = isUser
        ? { ...values, iban: normalizedIban }
        : { firstName: values.firstName, lastName: values.lastName, phone: values.phone };
      await apiFetch('/users/me/profile', { method: 'PATCH', body: payload });
      await refreshUser();
      showToast('Profil güncellendi.', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Güncellenemedi.'), 'error');
    }
  });

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Profilim</h1>

      <div style={cardStyle}>
        <div style={avatarRowStyle}>
          <div style={avatarStyle}>
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{user?.email}</div>
            <span style={roleBadgeStyle}>{roleLabels[user?.role ?? 'USER']}</span>
          </div>
        </div>

        <hr style={dividerStyle} />

        <form onSubmit={onSubmit} noValidate>
          <div className="profile-settings-fields">
            <Field label="Ad Soyad" error={errors.firstName?.message ?? errors.lastName?.message}>
              <div className="profile-name-fields">
                <input
                  {...register('firstName')}
                  aria-label="Ad"
                  placeholder="Ad"
                  style={inputStyle(Boolean(errors.firstName))}
                />
                <input
                  {...register('lastName')}
                  aria-label="Soyad"
                  placeholder="Soyad"
                  style={inputStyle(Boolean(errors.lastName))}
                />
              </div>
            </Field>
            <Field label="Telefon Numarası" error={errors.phone?.message}>
              <input {...register('phone')} type="tel" style={inputStyle(Boolean(errors.phone))} />
            </Field>
            <Field label="E-posta">
              <input value={user?.email ?? ''} readOnly style={readOnlyInputStyle} />
            </Field>
            {isUser && (
              <Field label="IBAN" error={errors.iban?.message}>
                <div className="profile-iban-row">
                  <Controller
                    name="iban"
                    control={control}
                    render={({ field }) => (
                      <TurkeyIbanInput
                        {...field}
                        aria-label="IBAN"
                        placeholder="TR000000000000000000000000"
                        style={{ ...inputStyle(Boolean(errors.iban)), flex: 1, minWidth: 0 }}
                      />
                    )}
                  />
                  <IbanCopyButton value={ibanValue} />
                </div>
                <p style={ibanHelpStyle}>TR sonrası {ibanDigitCount}/24 rakam</p>
              </Field>
            )}
            {!isUser && (
              <Field label="IBAN">
                <input
                  value="Yalnızca kullanıcı hesaplarında tanımlanır"
                  readOnly
                  style={readOnlyInputStyle}
                />
              </Field>
            )}
            <Field label="Para Birimi">
              <input value="TL" readOnly style={readOnlyInputStyle} />
            </Field>
            <Field label="Dil">
              <input value="TR" readOnly style={readOnlyInputStyle} />
            </Field>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="submit"
              disabled={isSubmitting || !isDirty}
              style={saveBtnStyle(isSubmitting || !isDirty)}
            >
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>

      <div className="profile-account-actions">
        <button
          type="button"
          onClick={() => navigate('/change-password')}
          className="profile-password-button"
        >
          <KeyRound size={16} />
          Şifre Değiştir
        </button>
        <div style={{ marginBottom: 14 }}>
          <div
            style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 3 }}
          >
            Çıkış Yap
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Bu cihazdan güvenli çıkış yapın. Tüm yerel veriler temizlenir.
          </div>
        </div>
        <button
          type="button"
          disabled={loggingOut}
          onClick={handleLogout}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 8,
            border: '1px solid var(--color-rejected-border)',
            background: 'var(--color-rejected-bg)',
            color: 'var(--color-rejected)',
            fontSize: 14,
            fontWeight: 600,
            cursor: loggingOut ? 'not-allowed' : 'pointer',
            opacity: loggingOut ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <LogOut size={16} />
          {loggingOut ? 'Çıkış yapılıyor…' : 'Çıkış Yap'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <p style={errStyle}>{error}</p>}
    </div>
  );
}

const pageStyle: React.CSSProperties = { padding: '28px 32px 96px', maxWidth: 700, width: '100%' };
const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: 'var(--color-text)',
  margin: '0 0 20px',
};
const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '28px 24px',
  boxShadow: 'var(--shadow-sm)',
};
const avatarRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  marginBottom: 20,
};
const avatarStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: '50%',
  background: 'var(--color-primary)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 20,
  fontWeight: 700,
  flexShrink: 0,
};
const roleBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  marginTop: 4,
  padding: '2px 10px',
  borderRadius: 12,
  background: 'var(--color-draft-bg)',
  color: 'var(--color-draft)',
  fontSize: 11,
  fontWeight: 600,
  border: '1px solid var(--color-draft-border)',
};
const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid var(--color-border)',
  margin: '20px 0',
};
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--color-text)',
  marginBottom: 6,
};
const inputStyle = (hasErr: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius-sm)',
  border: `1px solid ${hasErr ? 'var(--color-danger)' : 'var(--color-border)'}`,
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 16,
  boxSizing: 'border-box',
});
const errStyle: React.CSSProperties = {
  color: 'var(--color-danger)',
  fontSize: 12,
  margin: '4px 0 0',
};

const ibanHelpStyle: React.CSSProperties = {
  margin: '5px 0 0',
  color: 'var(--color-text-muted)',
  fontSize: 12,
  textAlign: 'right',
};
const readOnlyInputStyle: React.CSSProperties = {
  ...inputStyle(false),
  cursor: 'default',
  color: 'var(--color-text-muted)',
};
const saveBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '10px 28px',
  borderRadius: 6,
  border: 'none',
  background: disabled ? 'var(--color-border)' : 'var(--color-primary)',
  color: disabled ? 'var(--color-text-muted)' : '#fff',
  fontWeight: 600,
  fontSize: 14,
  cursor: disabled ? 'not-allowed' : 'pointer',
});
