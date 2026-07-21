import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@masraf/shared-validation';
import { Eye, EyeOff, Receipt } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, type Location } from 'react-router-dom';

import { useAuth } from '@/features/auth/auth-context';
import { ApiError } from '@/lib/api-client';

export function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      const from = (location.state as { from?: Location })?.from;
      const redirectTo = from ? `${from.pathname}${from.search}${from.hash}` : '/';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        setFormError('E-posta veya şifre hatalı.');
      } else {
        setFormError('Giriş yapılamadı. Lütfen tekrar deneyin.');
      }
    }
  });

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Logo / başlık */}
        <div style={logoAreaStyle}>
          <div style={iconWrapStyle}>
            <Receipt size={28} color="#fff" />
          </div>
          <h1 style={titleStyle}>Masraf Uygulaması</h1>
          <p style={subtitleStyle}>Hesabınıza giriş yapın</p>
        </div>

        <form onSubmit={onSubmit} noValidate style={formStyle}>
          {/* E-posta */}
          <div style={fieldGroupStyle}>
            <label htmlFor="email" style={labelStyle}>
              E-posta
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="ornek@sirket.com"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
              style={inputStyle(Boolean(errors.email))}
            />
            {errors.email && (
              <p role="alert" style={errorTextStyle}>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Şifre */}
          <div style={fieldGroupStyle}>
            <label htmlFor="password" style={labelStyle}>
              Şifre
            </label>
            <div style={passwordWrapStyle}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={Boolean(errors.password)}
                {...register('password')}
                style={{ ...inputStyle(Boolean(errors.password)), paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={eyeBtnStyle}
                tabIndex={-1}
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p role="alert" style={errorTextStyle}>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Form hatası */}
          {formError && (
            <div style={alertStyle} role="alert">
              {formError}
            </div>
          )}

          {/* Giriş butonu */}
          <button type="submit" disabled={isSubmitting} style={submitStyle}>
            {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
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
  maxWidth: 400,
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};

const logoAreaStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: 32,
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
  fontSize: 22,
  fontWeight: 700,
  color: 'var(--color-text)',
  margin: '0 0 6px',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--color-text-muted)',
  margin: 0,
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
};

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: 16,
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
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
});

const passwordWrapStyle: React.CSSProperties = {
  position: 'relative',
};

const eyeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  right: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-muted)',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
};

const errorTextStyle: React.CSSProperties = {
  color: 'var(--color-danger)',
  fontSize: 12,
  marginTop: 4,
  margin: '4px 0 0',
};

const alertStyle: React.CSSProperties = {
  background: 'var(--color-danger-bg)',
  color: 'var(--color-danger)',
  border: '1px solid var(--color-rejected-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 14px',
  fontSize: 13,
  marginBottom: 16,
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
  marginTop: 4,
  transition: 'background 0.15s',
};
