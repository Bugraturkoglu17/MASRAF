import type { ToastVariant } from './toast-context';
import { useToast } from './toast-context';

const VARIANT_STYLES: Record<ToastVariant, { bg: string; fg: string }> = {
  success: { bg: 'var(--color-success-bg)', fg: 'var(--color-success)' },
  error: { bg: 'var(--color-danger-bg)', fg: 'var(--color-danger)' },
  warning: { bg: 'var(--color-warning-bg)', fg: 'var(--color-warning)' },
  info: { bg: 'var(--color-surface)', fg: 'var(--color-text)' },
};

export function ToastViewport(): JSX.Element {
  const { toasts, dismissToast } = useToast();

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Bildirimler"
      style={{
        position: 'fixed',
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 1000,
        width: 'min(420px, calc(100vw - 32px))',
      }}
    >
      {toasts.map((toast) => {
        const style = VARIANT_STYLES[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            style={{
              background: style.bg,
              color: style.fg,
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              fontSize: 14,
            }}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Bildirimi kapat"
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
