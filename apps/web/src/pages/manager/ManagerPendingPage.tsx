import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Clock3, FolderOpen, ReceiptText, Search, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { ManagerExpenseCard, type ManagerExpense } from '@/components/expenses/ExpenseCards';
import { useToast } from '@/components/feedback/toast-context';
import { ExpenseDetailSheet } from '@/components/ui/ExpenseDetailSheet';
import { IbanCopyButton } from '@/components/ui/IbanCopyButton';
import { ApiError, apiFetch, getAccessToken } from '@/lib/api-client';

const MAX_RECEIPT_SIZE = 15 * 1024 * 1024;

interface PagedResult {
  items: ManagerExpense[];
  meta: { totalItems: number; page: number; totalPages: number };
}
type Decision = { kind: 'approve' | 'reject' | 'cancel'; expense: ManagerExpense };

type SortOption =
  | 'due-nearest'
  | 'due-farthest'
  | 'most-overdue'
  | 'newest'
  | 'oldest'
  | 'amount-high'
  | 'amount-low';

const SORT_LABELS: Record<SortOption, string> = {
  'due-nearest': 'Vadeye en yakın',
  'due-farthest': 'Vadeye en uzak',
  'most-overdue': 'En çok gecikmiş',
  newest: 'En yeni',
  oldest: 'En eski',
  'amount-high': 'En yüksek tutar',
  'amount-low': 'En düşük tutar',
};

export function ManagerPendingPage(): JSX.Element {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState('');
  const [sort, setSort] = useState<SortOption>('due-nearest');
  const [search, setSearch] = useState('');
  const [receiptExpenseId, setReceiptExpenseId] = useState<string | null>(null);
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  // showReceiptUpload: false = prompt modal, true = upload modal

  const apiSort = sort === 'amount-high' || sort === 'amount-low' ? ('newest' as const) : sort;

  const { data, isLoading } = useQuery<PagedResult>({
    queryKey: ['manager-pending', apiSort],
    queryFn: () => apiFetch(`/expenses/manager/pending?limit=100&sort=${apiSort}`),
    refetchInterval: 10000,
  });

  const filtered = useMemo(() => {
    let items = data?.items ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (e) =>
          `${e.user.firstName} ${e.user.lastName}`.toLowerCase().includes(q) ||
          (e.expenseCode ?? '').toLowerCase().includes(q) ||
          e.title.toLowerCase().includes(q) ||
          (e.description ?? '').toLowerCase().includes(q),
      );
    }
    if (sort === 'amount-high')
      return [...items].sort((a, b) => Number(b.amount) - Number(a.amount));
    if (sort === 'amount-low')
      return [...items].sort((a, b) => Number(a.amount) - Number(b.amount));
    return items;
  }, [data, search, sort]);

  const finish = (expenseId: string, message: string) => {
    qc.setQueryData<PagedResult>(['manager-pending', apiSort], (old) =>
      old
        ? {
            ...old,
            items: old.items.filter((item) => item.id !== expenseId),
            meta: { ...old.meta, totalItems: Math.max(0, old.meta.totalItems - 1) },
          }
        : old,
    );
    void qc.invalidateQueries({ queryKey: ['manager-counts'] });
    void qc.invalidateQueries({ queryKey: ['expenses'] });
    setDecision(null);
    setReason('');
    setDetailId(null);
    showToast(message, 'success');
  };
  const decide = useMutation({
    mutationFn: async (value: Decision) => {
      if (value.kind === 'approve')
        return apiFetch(`/expenses/${value.expense.id}/approve`, { method: 'POST' });
      return apiFetch(`/expenses/${value.expense.id}/${value.kind}`, {
        method: 'POST',
        body: { reason },
      });
    },
    onSuccess: (_, value) => {
      finish(
        value.expense.id,
        value.kind === 'approve'
          ? 'Masraf onaylandı.'
          : value.kind === 'reject'
            ? 'Masraf reddedildi.'
            : 'Masraf iptal edildi.',
      );
      if (value.kind === 'approve') {
        setReceiptExpenseId(value.expense.id);
      }
    },
    onError: (error) =>
      showToast(
        'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
        'error',
        error instanceof ApiError && error.requestId ? `Talep: ${error.requestId}` : undefined,
      ),
  });

  const handleReceiptSuccess = (expenseId: string) => {
    showToast('Ödeme dekontu yüklendi.', 'success');
    void qc.invalidateQueries({ queryKey: ['payment-receipts', expenseId] });
    setReceiptExpenseId(null);
    setShowReceiptUpload(false);
  };

  return (
    <div className="manager-expenses-page">
      <header className="manager-page-hero">
        <span>
          <Clock3 />
        </span>
        <div>
          <h1>Onayda Bekleyenler</h1>
          <p>{data?.meta.totalItems ?? 0} masraf kararınızı bekliyor</p>
        </div>
        <select
          className="manager-sort-select"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          aria-label="Sıralama"
        >
          {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </header>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search
          size={15}
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="search"
          placeholder="Ad, masraf no veya açıklama ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            paddingLeft: 34,
            paddingRight: 12,
            height: 38,
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <main className="manager-expense-list">
        {isLoading ? (
          <div className="expense-list-loading">Masraflar yükleniyor…</div>
        ) : !filtered.length ? (
          <div className="expense-empty-state">
            <span>
              <Clock3 />
            </span>
            <strong>{search ? 'Arama sonucu bulunamadı.' : 'Bekleyen masraf bulunmuyor.'}</strong>
            <p>
              {search
                ? 'Arama kriterini değiştirerek tekrar deneyin.'
                : 'Yeni gönderimler anlık olarak burada görünecek.'}
            </p>
          </div>
        ) : (
          filtered.map((expense) => (
            <ManagerExpenseCard
              key={expense.id}
              expense={expense}
              selected={detailId === expense.id}
              onSelect={() => setDetailId(expense.id)}
              onApprove={() => setDecision({ kind: 'approve', expense })}
              onReject={() => setDecision({ kind: 'reject', expense })}
              onCancel={() => setDecision({ kind: 'cancel', expense })}
              busy={decide.isPending}
            />
          ))
        )}
      </main>
      {detailId && <ExpenseDetailSheet expenseId={detailId} onClose={() => setDetailId(null)} />}
      {decision && (
        <DecisionModal
          decision={decision}
          reason={reason}
          onReason={setReason}
          busy={decide.isPending}
          onClose={() => {
            setDecision(null);
            setReason('');
          }}
          onConfirm={() => decide.mutate(decision)}
        />
      )}
      {receiptExpenseId && !showReceiptUpload && (
        <ReceiptPromptModal
          onUpload={() => setShowReceiptUpload(true)}
          onSkip={() => setReceiptExpenseId(null)}
        />
      )}
      {receiptExpenseId && showReceiptUpload && (
        <ReceiptUploadModal
          expenseId={receiptExpenseId}
          onSuccess={() => handleReceiptSuccess(receiptExpenseId)}
          onClose={() => {
            setReceiptExpenseId(null);
            setShowReceiptUpload(false);
          }}
        />
      )}
    </div>
  );
}

function DecisionModal({
  decision,
  reason,
  onReason,
  onClose,
  onConfirm,
  busy,
}: {
  decision: Decision;
  reason: string;
  onReason: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const requiresReason = decision.kind !== 'approve';
  const verb =
    decision.kind === 'approve' ? 'Onayla' : decision.kind === 'reject' ? 'Reddet' : 'İptal et';
  return (
    <div className="decision-backdrop" onMouseDown={onClose}>
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="decision-title"
        className="decision-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className={`decision-symbol ${decision.kind}`} />
        <h2 id="decision-title">Masrafı {verb.toLocaleLowerCase('tr-TR')}</h2>
        <p>
          <strong>
            {decision.expense.user.firstName} {decision.expense.user.lastName}
          </strong>{' '}
          tarafından gönderilen &ldquo;{decision.expense.title}&rdquo; masrafı için bu işlem
          uygulanacak.
        </p>
        {requiresReason && (
          <label>
            Gerekçe <span>*</span>
            <textarea
              autoFocus
              value={reason}
              onChange={(e) => onReason(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Karar gerekçesini açıklayın…"
            />
          </label>
        )}
        <div>
          <button type="button" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className={decision.kind}
            disabled={busy || (requiresReason && !reason.trim())}
            onClick={onConfirm}
          >
            {busy ? 'İşleniyor…' : verb}
          </button>
        </div>
      </section>
    </div>
  );
}

function ReceiptPromptModal({ onUpload, onSkip }: { onUpload: () => void; onSkip: () => void }) {
  return (
    <div className="decision-backdrop" onMouseDown={onSkip}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-prompt-title"
        className="decision-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="decision-symbol approve" />
        <h2 id="receipt-prompt-title">Ödeme Dekontu</h2>
        <p>Onaylanan masrafa ödeme dekontu yüklemek ister misiniz?</p>
        <div>
          <button type="button" onClick={onSkip}>
            Şimdi Değil
          </button>
          <button type="button" className="approve" onClick={onUpload}>
            Dekont Yükle
          </button>
        </div>
      </section>
    </div>
  );
}

type ReceiptPhase =
  | { tag: 'idle' }
  | { tag: 'selected'; file: File; previewUrl: string | null }
  | { tag: 'uploading'; progress: number }
  | { tag: 'success' }
  | { tag: 'error'; message: string };

interface ExpenseRecipientDetail {
  paymentRecipientType?: string | null;
  recipientFirstName?: string | null;
  recipientLastName?: string | null;
  recipientIban?: string | null;
  recipientCompanyName?: string | null;
}

function ReceiptUploadModal({
  expenseId,
  onSuccess,
  onClose,
}: {
  expenseId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<ReceiptPhase>({ tag: 'idle' });
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: expenseDetail } = useQuery<ExpenseRecipientDetail>({
    queryKey: ['expense-detail', expenseId],
    queryFn: () => apiFetch(`/expenses/${expenseId}`),
    staleTime: 60_000,
  });

  const pickFile = (file: File) => {
    if (file.size > MAX_RECEIPT_SIZE) {
      setPhase({ tag: 'error', message: "Dosya 15 MB'dan büyük olamaz." });
      return;
    }
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setPhase({ tag: 'selected', file, previewUrl });
  };

  const removeFile = () => {
    if (phase.tag === 'selected' && phase.previewUrl) URL.revokeObjectURL(phase.previewUrl);
    setPhase({ tag: 'idle' });
  };

  const startUpload = () => {
    if (phase.tag !== 'selected') return;
    const { file } = phase;
    setPhase({ tag: 'uploading', progress: 0 });

    const form = new FormData();
    form.append('file', file, file.name);
    const token = getAccessToken();
    const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiUrl}/expenses/${expenseId}/payment-receipts`);
    xhr.withCredentials = true;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        setPhase({ tag: 'uploading', progress: Math.round((e.loaded / e.total) * 100) });
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setPhase({ tag: 'success' });
        onSuccess();
      } else {
        let msg = 'Dekont yüklenemedi. Lütfen tekrar deneyin.';
        try {
          const err = JSON.parse(xhr.responseText) as { message?: string };
          if (err.message) msg = err.message;
        } catch {
          /* ignore */
        }
        setPhase({ tag: 'error', message: msg });
      }
    };
    xhr.onerror = () =>
      setPhase({ tag: 'error', message: 'Ağ hatası oluştu. Lütfen tekrar deneyin.' });
    xhr.send(form);
  };

  const isUploading = phase.tag === 'uploading';

  return (
    <div className="receipt-sheet-backdrop" onMouseDown={!isUploading ? onClose : undefined}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-upload-title"
        className="receipt-sheet"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Hidden file inputs */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickFile(f);
            e.target.value = '';
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.heic,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickFile(f);
            e.target.value = '';
          }}
        />

        <div className="receipt-sheet-handle" />

        {/* Header */}
        <div className="receipt-sheet-header">
          <div className="receipt-sheet-icon">
            <ReceiptText size={22} />
          </div>
          <h2 id="receipt-upload-title">Dekont Yükle</h2>
          {!isUploading && (
            <button
              type="button"
              className="receipt-sheet-close"
              onClick={onClose}
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Ödeme alıcısı */}
        {expenseDetail?.paymentRecipientType &&
          (expenseDetail.recipientFirstName || expenseDetail.recipientIban) && (
            <div className="receipt-sheet-recipient">
              <div className="receipt-sheet-recipient-info">
                <div className="receipt-sheet-recipient-label">
                  ÖDEME ALICISI
                  {expenseDetail.paymentRecipientType === 'THIRD_PARTY' && (
                    <span className="receipt-sheet-badge">TAŞERON</span>
                  )}
                </div>
                {expenseDetail.recipientFirstName && expenseDetail.recipientLastName && (
                  <div className="receipt-sheet-recipient-name">
                    {expenseDetail.recipientFirstName} {expenseDetail.recipientLastName}
                  </div>
                )}
                {expenseDetail.recipientCompanyName && (
                  <div className="receipt-sheet-recipient-company">
                    {expenseDetail.recipientCompanyName}
                  </div>
                )}
              </div>
              {expenseDetail.recipientIban && (
                <IbanCopyButton value={expenseDetail.recipientIban} />
              )}
            </div>
          )}

        {/* IDLE — dosya seçim */}
        {phase.tag === 'idle' && (
          <>
            <div className="receipt-pick-grid">
              <button
                type="button"
                className="receipt-pick-card"
                onClick={() => cameraRef.current?.click()}
              >
                <Camera size={26} />
                <span>Kamera</span>
              </button>
              <button
                type="button"
                className="receipt-pick-card"
                onClick={() => fileRef.current?.click()}
              >
                <FolderOpen size={26} />
                <span>Dosya Yükle</span>
              </button>
            </div>
            <p className="receipt-pick-hint">JPG · PNG · WEBP · HEIC · PDF — maks. 15 MB</p>
          </>
        )}

        {/* SELECTED — önizleme */}
        {phase.tag === 'selected' && (
          <div className="receipt-sheet-preview">
            {phase.previewUrl ? (
              <img src={phase.previewUrl} alt="Dekont önizleme" />
            ) : (
              <div className="receipt-sheet-filename">{phase.file.name}</div>
            )}
            <p className="receipt-sheet-filesize">{(phase.file.size / 1024).toFixed(0)} KB</p>
          </div>
        )}

        {/* UPLOADING */}
        {phase.tag === 'uploading' && (
          <div>
            <div className="receipt-sheet-progress">
              <div className="receipt-sheet-progress-bar" style={{ width: `${phase.progress}%` }} />
            </div>
            <p className="receipt-sheet-progress-label">Yükleniyor… %{phase.progress}</p>
          </div>
        )}

        {/* SUCCESS */}
        {phase.tag === 'success' && (
          <p className="receipt-sheet-success">Dekont başarıyla yüklendi.</p>
        )}

        {/* ERROR */}
        {phase.tag === 'error' && <p className="receipt-sheet-error">{phase.message}</p>}

        {/* Aksiyon butonları */}
        {phase.tag === 'selected' && (
          <div className="receipt-sheet-actions">
            <button type="button" onClick={removeFile}>
              Sil
            </button>
            <button type="button" className="primary" onClick={startUpload}>
              Gönder
            </button>
          </div>
        )}
        {phase.tag === 'uploading' && (
          <div className="receipt-sheet-actions single">
            <button type="button" disabled>
              Yükleniyor…
            </button>
          </div>
        )}
        {phase.tag === 'success' && (
          <div className="receipt-sheet-actions single">
            <button type="button" className="primary" onClick={onClose}>
              Tamam
            </button>
          </div>
        )}
        {phase.tag === 'error' && (
          <div className="receipt-sheet-actions">
            <button type="button" onClick={onClose}>
              Kapat
            </button>
            <button type="button" className="primary" onClick={() => setPhase({ tag: 'idle' })}>
              Yeniden Dene
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
