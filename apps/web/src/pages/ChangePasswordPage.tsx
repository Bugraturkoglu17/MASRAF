import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { BrandLogo } from '@/components/BrandLogo';
import { useToast } from '@/components/feedback/toast-context';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch, getApiErrorMessage } from '@/lib/api-client';

const schema = z
  .object({
    newPassword: z.string().min(8, 'Şifre en az 8 karakter olmalıdır.'),
    newPasswordConfirm: z.string(),
  })
  .refine((v) => v.newPassword === v.newPasswordConfirm, {
    message: 'Şifreler eşleşmiyor.',
    path: ['newPasswordConfirm'],
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage(): JSX.Element {
  const { refreshUser, logout } = useAuth();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await apiFetch('/users/me/password', { method: 'PATCH', body: values });
      await refreshUser();
      showToast('Şifreniz güncellendi.', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Şifre güncellenemedi. Lütfen tekrar deneyin.'), 'error');
    }
  });

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <BrandLogo />
          <h1 style={titleStyle}>Yeni Şifre Belirleyin</h1>
          <p style={subtitleStyle}>
            Hesabınız geçici bir şifreyle oluşturuldu. Devam etmek için yeni bir şifre belirleyin.
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <Field label="Yeni Şifre" error={errors.newPassword?.message}>
            <input
              {...register('newPassword')}
              type="password"
              autoComplete="new-password"
              style={inputStyle(Boolean(errors.newPassword))}
            />
          </Field>

          <Field label="Yeni Şifre (Tekrar)" error={errors.newPasswordConfirm?.message}>
            <input
              {...register('newPasswordConfirm')}
              type="password"
              autoComplete="new-password"
              style={inputStyle(Boolean(errors.newPasswordConfirm))}
            />
          </Field>

          <button type="submit" disabled={isSubmitting} style={submitStyle}>
            {isSubmitting ? 'Kaydediliyor...' : 'Şifreyi Kaydet'}
          </button>
        </form>

        <button onClick={() => void logout()} style={logoutStyle}>
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
  maxWidth: 440,
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  marginBottom: 24,
  gap: 10,
};

const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--color-text)',
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--color-text-muted)',
  margin: 0,
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
