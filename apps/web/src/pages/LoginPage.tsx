import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@masraf/shared-validation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/auth-context';
import { ApiError } from '@/lib/api-client';

export function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        setFormError('E-posta veya şifre hatalı.');
      } else {
        setFormError('Giriş yapılamadı. Lütfen daha sonra tekrar deneyin.');
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Giriş Yap</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>
        Masraf Yönetim Sistemi hesabınızla oturum açın.
      </p>

      <label htmlFor="email" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
        E-posta
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        aria-invalid={Boolean(errors.email)}
        aria-describedby={errors.email ? 'email-error' : undefined}
        {...register('email')}
        style={inputStyle}
      />
      {errors.email ? (
        <p id="email-error" role="alert" style={errorTextStyle}>
          {errors.email.message}
        </p>
      ) : null}

      <label htmlFor="password" style={{ display: 'block', fontSize: 13, margin: '12px 0 4px' }}>
        Şifre
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        aria-invalid={Boolean(errors.password)}
        aria-describedby={errors.password ? 'password-error' : undefined}
        {...register('password')}
        style={inputStyle}
      />
      {errors.password ? (
        <p id="password-error" role="alert" style={errorTextStyle}>
          {errors.password.message}
        </p>
      ) : null}

      {formError ? (
        <p role="alert" style={{ ...errorTextStyle, marginTop: 12 }}>
          {formError}
        </p>
      ) : null}

      <button type="submit" disabled={isSubmitting} style={submitStyle}>
        {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 14,
};

const errorTextStyle: React.CSSProperties = {
  color: 'var(--color-danger)',
  fontSize: 12,
  marginTop: 4,
};

const submitStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 24,
  padding: '10px 12px',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  background: 'var(--color-primary)',
  color: 'var(--color-primary-contrast)',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};
