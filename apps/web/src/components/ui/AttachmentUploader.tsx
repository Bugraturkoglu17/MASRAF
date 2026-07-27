import {
  Camera,
  CheckCircle2,
  Eye,
  FileText,
  ImagePlus,
  RefreshCw,
  RepeatIcon,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/feedback/toast-context';
import type { AttachmentUploads, UploadItem } from '@/hooks/useAttachmentUploads';
import { apiFetch, getApiErrorMessage } from '@/lib/api-client';

interface Props {
  uploads: AttachmentUploads;
  maxFiles: number;
  maxFileSizeBytes: number;
  disabled?: boolean;
  /** Masraf taslağı henüz oluşmadıysa true — kart etiketi buna göre değişir. */
  awaitingExpense?: boolean;
}

export function AttachmentUploader({
  uploads,
  maxFiles,
  maxFileSizeBytes,
  disabled = false,
  awaitingExpense = false,
}: Props): JSX.Element {
  const { showToast } = useToast();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceTargetId = useRef<string | null>(null);

  const { items } = uploads;
  const atMax = items.length >= maxFiles;

  const onFileInputChange = (event: React.ChangeEvent<HTMLInputElement>, replaceId?: string) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    if (replaceId) {
      const replacement = files[0];
      if (!replacement) return;
      void uploads.remove(replaceId).then(() => uploads.addFiles([replacement]));
      replaceTargetId.current = null;
      return;
    }
    uploads.addFiles(files);
  };

  const openAttachment = async (item: UploadItem) => {
    if (item.previewUrl && item.mimeType.startsWith('image/')) {
      setLightbox(item.previewUrl);
      return;
    }
    if (!item.uploaded) return;
    try {
      const { url } = await apiFetch<{ url: string }>(
        `/attachments/${item.uploaded.id}/download-url`,
      );
      if (item.mimeType === 'application/pdf') {
        const opened = window.open(url, '_blank', 'noopener,noreferrer');
        if (!opened)
          showToast('PDF açılamadı. Tarayıcı açılır pencere iznini kontrol edin.', 'error');
      } else {
        setLightbox(url);
      }
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Belge önizlemesi alınamadı.'), 'error');
    }
  };

  return (
    <>
      <section className="attachment-uploader" aria-label="Masraf belgeleri">
        <input
          ref={cameraRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={onFileInputChange}
        />
        <input
          ref={galleryRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={onFileInputChange}
        />
        <input
          ref={replaceRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(event) => onFileInputChange(event, replaceTargetId.current ?? undefined)}
        />

        <div className="attachment-action-row">
          <button
            type="button"
            className="upload-action-btn"
            disabled={disabled || atMax}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera size={20} />
            <span>Fotoğraf Çek</span>
          </button>
          <button
            type="button"
            className="upload-action-btn"
            disabled={disabled || atMax}
            onClick={() => galleryRef.current?.click()}
          >
            <ImagePlus size={20} />
            <span>Fotoğraf Yükle</span>
          </button>
          <small className="attachment-count">
            {items.length}/{maxFiles} belge
          </small>
        </div>

        {items.length > 0 && (
          <div className="attachment-list">
            {items.map((item) => (
              <AttachmentCard
                key={item.localId}
                item={item}
                awaitingExpense={awaitingExpense}
                onDelete={disabled ? undefined : () => void uploads.remove(item.localId)}
                onRetry={item.status === 'error' ? () => uploads.retry(item.localId) : undefined}
                onView={item.status === 'done' ? () => void openAttachment(item) : undefined}
                onReplace={
                  disabled || item.status !== 'done'
                    ? undefined
                    : () => {
                        replaceTargetId.current = item.localId;
                        replaceRef.current?.click();
                      }
                }
              />
            ))}
          </div>
        )}

        <p className="attachment-help">
          Orijinal görüntü boyutu korunur · JPG, JPEG, PNG veya PDF · dosya başına en fazla{' '}
          {(maxFileSizeBytes / 1024 / 1024).toFixed(0)} MB
        </p>
      </section>

      {lightbox && (
        <div className="img-lightbox-backdrop" onClick={() => setLightbox(null)}>
          <button
            type="button"
            className="img-lightbox-close"
            onClick={() => setLightbox(null)}
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
          <img
            src={lightbox}
            alt="Belge önizleme"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '82vh', borderRadius: 8, objectFit: 'contain' }}
          />
        </div>
      )}
    </>
  );
}

export const ExpenseAttachmentUploader = AttachmentUploader;

// ── AttachmentCard ────────────────────────────────────────────────────────────

function AttachmentCard({
  item,
  awaitingExpense,
  onDelete,
  onRetry,
  onView,
  onReplace,
}: {
  item: UploadItem;
  awaitingExpense: boolean;
  onDelete?: () => void;
  onRetry?: () => void;
  onView?: () => void;
  onReplace?: () => void;
}) {
  const [remoteUrl, setRemoteUrl] = useState<string>();
  const attachmentId = item.uploaded?.id;

  useEffect(() => {
    if (item.previewUrl || !attachmentId || !item.mimeType.startsWith('image/')) return;
    void apiFetch<{ url: string }>(`/attachments/${attachmentId}/download-url`)
      .then(({ url }) => setRemoteUrl(url))
      .catch(() => undefined);
  }, [item.previewUrl, attachmentId, item.mimeType]);

  const thumbSrc = item.previewUrl ?? remoteUrl;
  const name = item.uploaded?.fileName ?? item.file.name;
  const size = item.uploaded?.sizeBytes ?? item.file.size;
  const isDone = item.status === 'done';

  return (
    <article className={`attachment-preview ${item.status === 'error' ? 'has-error' : ''}`}>
      <span
        className="attachment-thumbnail"
        style={onView ? { cursor: 'pointer' } : undefined}
        onClick={onView}
        role={onView ? 'button' : undefined}
        tabIndex={onView ? 0 : undefined}
        onKeyDown={onView ? (event) => event.key === 'Enter' && onView() : undefined}
        aria-label={onView ? `${name} önizle` : undefined}
      >
        {thumbSrc ? <img src={thumbSrc} alt="" /> : <FileText />}
      </span>

      <div className="attachment-meta">
        <strong title={name}>{name}</strong>

        {isDone ? (
          <small className="upload-status-done">
            <CheckCircle2 size={11} aria-hidden />
            {formatBytes(size)} · Yüklendi
          </small>
        ) : (
          <small>
            {formatBytes(size)}
            {item.status === 'uploading' && ` · Yükleniyor %${Math.round(item.progress)}`}
            {item.status === 'waiting' &&
              (awaitingExpense ? ' · Kaydedilince yüklenecek' : ' · Yükleme hazırlanıyor…')}
          </small>
        )}

        {item.status === 'uploading' && (
          <div className={`upload-progress${item.progress >= 100 ? ' complete' : ''}`}>
            <span style={{ transform: `scaleX(${item.progress / 100})` }} />
          </div>
        )}

        {item.status === 'error' && item.error && <span role="alert">{item.error}</span>}
      </div>

      <div className="attachment-card-actions">
        {onRetry && (
          <button
            type="button"
            className="attachment-icon-button"
            aria-label={`${name} yüklemesini yeniden dene`}
            onClick={onRetry}
          >
            <RefreshCw size={14} />
          </button>
        )}
        {onView && (
          <button
            type="button"
            className="attachment-icon-button"
            aria-label={`${name} görüntüle`}
            onClick={onView}
          >
            <Eye size={14} />
          </button>
        )}
        {onReplace && (
          <button
            type="button"
            className="attachment-icon-button"
            aria-label={`${name} değiştir`}
            onClick={onReplace}
          >
            <RepeatIcon size={14} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="attachment-icon-button danger"
            aria-label={`${name} sil`}
            onClick={onDelete}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </article>
  );
}

function formatBytes(value: number) {
  return value >= 1024 * 1024
    ? `${(value / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(value / 1024)} KB`;
}
