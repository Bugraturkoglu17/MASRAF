import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

interface IbanCopyButtonProps {
  value?: string | null;
  iconOnly?: boolean;
}

async function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export function IbanCopyButton({
  value,
  iconOnly = false,
}: IbanCopyButtonProps): JSX.Element | null {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2_000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const normalizedValue = value?.replace(/\s/g, '').toUpperCase() ?? '';
  if (!/^TR\d{24}$/.test(normalizedValue)) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await copyToClipboard(normalizedValue);
        setCopied(true);
      }}
      aria-label={copied ? 'IBAN kopyalandı' : 'IBAN’ı kopyala'}
      title={copied ? 'Kopyalandı' : 'IBAN’ı kopyala'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        minHeight: 30,
        padding: iconOnly ? 6 : '4px 8px',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        background: 'var(--color-bg)',
        color: copied ? 'var(--color-success, #22c55e)' : 'var(--color-text-muted)',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      {iconOnly ? (
        <span
          aria-live="polite"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {copied ? 'Kopyalandı' : 'IBAN’ı kopyala'}
        </span>
      ) : (
        <span aria-live="polite">{copied ? 'Kopyalandı' : 'Kopyala'}</span>
      )}
    </button>
  );
}
