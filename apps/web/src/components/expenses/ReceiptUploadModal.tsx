import { useQuery } from '@tanstack/react-query';
import { Camera, FolderOpen, ReceiptText, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { IbanCopyButton } from '@/components/ui/IbanCopyButton';
import { apiFetch, getAccessToken } from '@/lib/api-client';

const MAX_RECEIPT_SIZE = 15 * 1024 * 1024;

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

export function ReceiptUploadModal({
  expenseId,
  onSuccess,
  onClose,
}: {
  expenseId: string;
  onSuccess: () => void;
  onClose: () => void;
}): JSX.Element {
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
              <div
                className="receipt-sheet-progress-bar"
                style={{ transform: `scaleX(${phase.progress / 100})` }}
              />
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
