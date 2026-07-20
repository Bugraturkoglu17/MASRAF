import { Send } from 'lucide-react';
import { useState } from 'react';

interface ExpenseSubmitDialogProps {
  expenseTitle: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function ExpenseSubmitDialog({
  expenseTitle,
  onConfirm,
  onClose,
}: ExpenseSubmitDialogProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız oldu.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '0 16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          padding: '24px 20px',
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: 'var(--color-pending-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Send size={17} color="var(--color-pending)" />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Masrafı Onaya Gönder
          </h2>
        </div>

        <p
          style={{
            fontSize: 14,
            color: 'var(--color-text-muted)',
            margin: '0 0 8px',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: 'var(--color-text)' }}>{expenseTitle}</strong> başlıklı masrafı
          onaya göndermek istediğinize emin misiniz?
        </p>
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-text-muted)',
            margin: '0 0 20px',
            lineHeight: 1.5,
          }}
        >
          Gönderildikten sonra masraf düzenlenemez veya silinemez.
        </p>

        {error && (
          <div
            style={{
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: 6,
              padding: '10px 12px',
              fontSize: 13,
              color: 'var(--color-danger)',
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 18px',
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text)',
              fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Vazgeç
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              padding: '10px 18px',
              borderRadius: 6,
              border: 'none',
              background: loading ? 'var(--color-border)' : 'var(--color-pending)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 130,
              justifyContent: 'center',
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    display: 'inline-block',
                  }}
                />
                Gönderiliyor...
              </>
            ) : (
              <>
                <Send size={14} /> Onaya Gönder
              </>
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
