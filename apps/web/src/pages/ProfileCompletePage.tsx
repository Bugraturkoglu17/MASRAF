import { zodResolver } from '@hookform/resolvers/zod';
import { UserCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useToast } from '@/components/feedback/toast-context';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch, getApiErrorMessage } from '@/lib/api-client';

const schema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur'),
  lastName: z.string().min(1, 'Soyad zorunludur'),
  phone: z.string().min(1, 'Telefon zorunludur'),
  iban: z.string().min(1, 'IBAN zorunludur'),
});

type FormValues = z.infer<typeof schema>;

export function ProfileCompletePage(): JSX.Element {
  const { user, refreshUser, logout } = useAuth();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
      iban: user?.iban ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await apiFetch('/users/me/profile', { method: 'PATCH', body: values });
      await refreshUser();
      showToast('Profil başarıyla tamamlandı.', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Profil kaydedilemedi. Lütfen tekrar deneyin.'), 'error');
    }
  });

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={iconWrapStyle}>
            <UserCircle size={28} color="#fff" />
          </div>
          <h1 style={titleStyle}>Profilinizi Tamamlayın</h1>
          <p style={subtitleStyle}>Devam etmek için aşağıdaki bilgileri doldurun.</p>
        </div>

        {user?.organization && (
          <div style={orgBadgeStyle}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Şirket</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
              {user.organization.name}
            </span>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
        >
          <div style={rowStyle}>
            <Field label="Ad" error={errors.firstName?.message}>
              <input
                {...register('firstName')}
                placeholder="Adınız"
                style={inputStyle(Boolean(errors.firstName))}
              />
            </Field>
            <Field label="Soyad" error={errors.lastName?.message}>
              <input
                {...register('lastName')}
                placeholder="Soyadınız"
                style={inputStyle(Boolean(errors.lastName))}
              />
            </Field>
          </div>

          <Field label="Telefon" error={errors.phone?.message}>
            <input
              {...register('phone')}
              type="tel"
              placeholder="+90 5XX XXX XX XX"
              style={inputStyle(Boolean(errors.phone))}
            />
          </Field>

          <Field label="IBAN" error={errors.iban?.message}>
            <input
              {...register('iban')}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              style={inputStyle(Boolean(errors.iban))}
            />
          </Field>

          <Field label="E-posta">
            <input
              value={user?.email ?? ''}
              readOnly
              style={{
                ...inputStyle(false),
                background: 'var(--color-bg)',
                color: 'var(--color-text-muted)',
                cursor: 'not-allowed',
              }}
            />
          </Field>

          <button type="submit" disabled={isSubmitting} style={submitStyle}>
            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet ve Devam Et'}
          </button>
        </form>

        <button onClick={logout} style={logoutStyle}>
          Çıkış Yap
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
}): JSX.Element {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
  padding: '16px',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  padding: '40px 32px',
  width: '100%',
  maxWidth: 480,
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: 24,
};

const iconWrapStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 56,
  height: 56,
  borderRadius: 16,
  background: 'var(--color-primary)',
  marginBottom: 16,
};

const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--color-text)',
  margin: '0 0 6px',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--color-text-muted)',
  margin: 0,
};

const orgBadgeStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 14px',
  marginBottom: 20,
};

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--color-text)',
  marginBottom: 6,
};

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '11px 14px',
  borderRadius: 'var(--radius-sm)',
  border: `1px solid ${hasError ? 'var(--color-danger)' : 'var(--color-border)'}`,
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 14,
  boxSizing: 'border-box',
});

const errorStyle: React.CSSProperties = {
  color: 'var(--color-danger)',
  fontSize: 12,
  margin: '4px 0 0',
};

const submitStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  background: 'var(--color-primary)',
  color: '#fff',
  fontWeight: 600,
  fontSize: 15,
  cursor: 'pointer',
  marginTop: 8,
};

const logoutStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 12,
  padding: '10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text-muted)',
  fontSize: 14,
  cursor: 'pointer',
  textAlign: 'center',
};
