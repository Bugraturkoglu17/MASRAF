import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

import type { ToastVariant } from './toast-context';
import { useToast } from './toast-context';

const VARIANT_ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
} satisfies Record<ToastVariant, typeof Info>;

const VARIANT_LABELS: Record<ToastVariant, string> = {
  success: 'Başarılı',
  error: 'Hata',
  warning: 'Uyarı',
  info: 'Bilgi',
};

export function ToastViewport(): JSX.Element {
  const { toasts, dismissToast } = useToast();

  return (
    <section className="toast-viewport" aria-label="Bildirimler" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = VARIANT_ICONS[toast.variant];
        return (
          <article
            key={toast.id}
            role={toast.variant === 'error' ? 'alert' : 'status'}
            aria-atomic="true"
            className={`app-toast app-toast--${toast.variant} app-toast--${toast.state}`}
          >
            <span className="app-toast__icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="app-toast__content">
              <span className="sr-only">{VARIANT_LABELS[toast.variant]}: </span>
              <strong>{toast.message}</strong>
              {toast.detail && <small>{toast.detail}</small>}
            </span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Bildirimi kapat"
              className="app-toast__close"
            >
              <X aria-hidden="true" />
            </button>
          </article>
        );
      })}
    </section>
  );
}
