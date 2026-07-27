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
        top: 'max(12px, env(safe-area-inset-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 1000,
        width: 'min(360px, calc(100vw - 24px))',
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
              padding: '10px 12px',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              fontSize: 14,
            }}
          >
            <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <strong style={{ display: 'block', fontWeight: 600 }}>{toast.message}</strong>
              {toast.detail && (
                <small style={{ display: 'block', marginTop: 3, opacity: 0.75, fontSize: 11 }}>
                  {toast.detail}
                </small>
              )}
            </span>
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
