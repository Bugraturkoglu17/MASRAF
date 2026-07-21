import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useToast } from '@/components/feedback/toast-context';
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
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
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

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = isUser
        ? values
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
          <div style={gridStyle}>
            <Field label="Ad" error={errors.firstName?.message}>
              <input {...register('firstName')} style={inputStyle(Boolean(errors.firstName))} />
            </Field>
            <Field label="Soyad" error={errors.lastName?.message}>
              <input {...register('lastName')} style={inputStyle(Boolean(errors.lastName))} />
            </Field>
            <Field label="Telefon" error={errors.phone?.message}>
              <input {...register('phone')} type="tel" style={inputStyle(Boolean(errors.phone))} />
            </Field>
            {isUser && (
              <Field label="IBAN" error={errors.iban?.message}>
                <input {...register('iban')} style={inputStyle(Boolean(errors.iban))} />
              </Field>
            )}
            <Field label="E-posta">
              <input
                value={user?.email ?? ''}
                readOnly
                style={{ ...inputStyle(false), cursor: 'not-allowed', opacity: 0.7 }}
              />
            </Field>
            <Field label="Şirket">
              <input
                value={user?.organization?.name ?? '—'}
                readOnly
                style={{ ...inputStyle(false), cursor: 'not-allowed', opacity: 0.7 }}
              />
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

const pageStyle: React.CSSProperties = { padding: '28px 32px', maxWidth: 700 };
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
const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px 20px',
  marginBottom: 24,
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
  fontSize: 14,
  boxSizing: 'border-box',
});
const errStyle: React.CSSProperties = {
  color: 'var(--color-danger)',
  fontSize: 12,
  margin: '4px 0 0',
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
