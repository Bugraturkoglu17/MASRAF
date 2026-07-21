import { FileClock, Trash2 } from 'lucide-react';

import type { LocalExpenseDraft } from '@/hooks/useLocalExpenseDraft';

export function LocalDraftRecoverySheet({
  draft,
  onRecover,
  onDelete,
}: {
  draft: LocalExpenseDraft | null;
  onRecover: () => void;
  onDelete: () => void;
}): JSX.Element | null {
  if (!draft) return null;
  return (
    <div className="pwa-sheet-backdrop" role="presentation">
      <section
        className="pwa-bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-recovery-title"
      >
        <div className="pwa-sheet-handle" aria-hidden="true" />
        <FileClock size={32} color="var(--color-primary)" aria-hidden="true" />
        <h2 id="draft-recovery-title">Kaydedilmemiş taslağınız var</h2>
        <p>
          {draft.title ? `“${draft.title}” taslağı` : 'Masraf taslağınız'} bu cihazda güvenli
          şekilde saklandı.
        </p>
        <div className="pwa-sheet-actions">
          <button type="button" className="pwa-danger-button" onClick={onDelete}>
            <Trash2 size={17} aria-hidden="true" /> Sil
          </button>
          <button type="button" className="pwa-primary-button" onClick={onRecover}>
            Devam Et
          </button>
        </div>
      </section>
    </div>
  );
}
