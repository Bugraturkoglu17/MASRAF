import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@masraf/shared-validation';
import { Eye, EyeOff, ReceiptText, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, type Location } from 'react-router-dom';

import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/features/auth/auth-context';
import { getPostLoginPath } from '@/features/auth/role-home';
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

  const onSubmit = handleSubmit(
    async (values) => {
      setFormError(null);
      try {
        const currentUser = await login(values.identifier, values.password);
        const from = (location.state as { from?: Location })?.from;
        const requestedPath = from ? `${from.pathname}${from.search}${from.hash}` : undefined;
        const redirectTo = currentUser.mustChangePassword
          ? '/change-password'
          : !currentUser.profileCompleted
            ? '/complete-profile'
            : getPostLoginPath(currentUser.role, requestedPath);
        navigate(redirectTo, { replace: true });
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          setFormError('E-posta, telefon veya şifre hatalı.');
        } else if (error instanceof ApiError && error.statusCode === 429) {
          // Ard arda denemede sunucu 429 döner; genel "tekrar deneyin" mesajı
          // kullanıcıyı hemen yeniden denemeye itip kilidi sürekli yeniler.
          setFormError(
            'Çok fazla giriş denemesi yapıldı. Lütfen 1 dakika bekleyip tekrar deneyin.',
          );
        } else {
          setFormError('Giriş yapılamadı. Lütfen tekrar deneyin.');
        }
      }
    },
    (validationErrors) => {
      // Doğrulama, bu formda karşılığı olmayan bir alanda patlarsa (istemci ile
      // sunucu şema sürümleri ayrışmışsa — ör. eski bir service worker önbelleği
      // hâlâ eski paketi çalıştırıyorsa) hiçbir alan hatası render edilemez ve
      // buton kullanıcıya sessizce ölü görünür. Bu durumda form seviyesinde uyar.
      const renderable = Object.keys(validationErrors).some(
        (field) => field === 'identifier' || field === 'password',
      );
      if (!renderable) {
        setFormError(
          'Uygulamanın eski bir sürümü çalışıyor. Lütfen sayfayı yenileyin (Ctrl+Shift+R).',
        );
      }
    },
  );

  return (
    <main className="auth-shell">
      <div className="auth-frame">
        <section className="auth-brand-panel" aria-label="Masraf yönetim platformu">
          <div className="auth-brand-logo">
            <BrandLogo />
          </div>

          <div className="auth-brand-copy">
            <span className="auth-kicker">MASRAF YÖNETİM PLATFORMU</span>
            <h1>Masraf akışınız, tek ve güvenli bir yerde.</h1>
            <p>
              Harcama kayıtlarını oluşturun, onay süreçlerini takip edin ve ekip görünürlüğünü
              kaybetmeden ilerleyin.
            </p>
          </div>

          <div className="auth-capabilities" aria-label="Platform özellikleri">
            <div>
              <ReceiptText size={18} aria-hidden="true" />
              <span>Uçtan uca masraf takibi</span>
            </div>
            <div>
              <ShieldCheck size={18} aria-hidden="true" />
              <span>Rol bazlı güvenli erişim</span>
            </div>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-heading">
            <img
              className="auth-form-logo"
              src="/logo-mark-animated.svg"
              alt=""
              aria-hidden="true"
            />
            <div>
              <h2>MASRAF</h2>
              <p>Devam etmek için kurumsal hesabınızla giriş yapın.</p>
            </div>
          </div>

          <form onSubmit={onSubmit} noValidate className="auth-form">
            <div className="auth-field">
              <label htmlFor="identifier">E-posta veya Telefon</label>
              <input
                id="identifier"
                type="text"
                inputMode="text"
                autoComplete="username"
                placeholder="ornek@sirket.com veya 5XX XXX XX XX"
                aria-invalid={Boolean(errors.identifier)}
                aria-describedby={errors.identifier ? 'identifier-error' : undefined}
                {...register('identifier')}
              />
              {errors.identifier && (
                <p id="identifier-error" role="alert" className="auth-field-error">
                  {errors.identifier.message}
                </p>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="password">Şifre</label>
              <div className="auth-password-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="auth-password-toggle"
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="auth-field-error">
                  {errors.password.message}
                </p>
              )}
            </div>

            {formError && (
              <div className="auth-alert" role="alert">
                {formError}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="auth-submit">
              <span className="auth-submit-content" aria-live="polite">
                {isSubmitting && <span className="auth-submit-spinner" aria-hidden="true" />}
                <span>{isSubmitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}</span>
              </span>
            </button>
          </form>

          <p className="auth-security-note">
            <ShieldCheck size={14} aria-hidden="true" /> Oturum bilgileriniz güvenli bağlantı
            üzerinden iletilir.
          </p>
        </section>
      </div>
    </main>
  );
}
