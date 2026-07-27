import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

interface IbanCopyButtonProps {
  value?: string | null;
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

export function IbanCopyButton({ value }: IbanCopyButtonProps): JSX.Element | null {
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
      className={`iban-copy-button${copied ? ' copied' : ''}`}
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
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
    </button>
  );
}
