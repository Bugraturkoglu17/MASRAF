export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Onayla',
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div
        aria-hidden="true"
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--color-surface)',
          borderRadius: 16,
          padding: '24px 20px 20px',
          width: 308,
          maxWidth: '90vw',
          zIndex: 1001,
          boxShadow: '0 12px 48px rgba(0,0,0,0.3)',
        }}
      >
        <h3
          id="confirm-dialog-title"
          style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: '0 0 22px',
            fontSize: 14,
            color: 'var(--color-text-muted)',
            lineHeight: 1.55,
          }}
        >
          {description}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 10,
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            İptal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--color-danger)',
              color: '#fff',
              cursor: busy ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 700,
              opacity: busy ? 0.7 : 1,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
