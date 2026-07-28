import { zodResolver } from '@hookform/resolvers/zod';
import { UserCircle } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { useToast } from '@/components/feedback/toast-context';
import { IbanCopyButton } from '@/components/ui/IbanCopyButton';
import { normalizeTurkeyIban } from '@/components/ui/turkey-iban';
import { TurkeyIbanInput } from '@/components/ui/TurkeyIbanInput';
import { useAuth } from '@/features/auth/auth-context';
import { getRoleHome } from '@/features/auth/role-home';
import { apiFetch, getApiErrorMessage } from '@/lib/api-client';

const schema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur'),
  lastName: z.string().min(1, 'Soyad zorunludur'),
  phone: z.string().min(1, 'Telefon zorunludur'),
  iban: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ProfileCompletePage(): JSX.Element {
  const { user, refreshUser, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isUser = user?.role === 'USER';

  const {
    register,
    handleSubmit,
    setError,
    control,
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

  const ibanValue = useWatch({ control, name: 'iban' });
  const ibanDigitCount = (ibanValue ?? '').replace(/\D/g, '').length;
  const hasRealEmail = Boolean(user?.email && !user.email.endsWith('@masraf.local'));

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
      const currentUser = await refreshUser();
      showToast('Profil başarıyla tamamlandı.', 'success');
      navigate(getRoleHome(currentUser.role), { replace: true });
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

          {hasRealEmail && (
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
          )}

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
  error: _error,
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
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh',
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

const ibanHelpStyle: React.CSSProperties = {
  margin: '5px 0 0',
  color: 'var(--color-text-muted)',
  fontSize: 12,
  textAlign: 'right',
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
