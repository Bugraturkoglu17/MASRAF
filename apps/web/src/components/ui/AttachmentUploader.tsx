import { Camera, FileText, Image, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/feedback/toast-context';
import { apiFetch, getApiErrorMessage } from '@/lib/api-client';

export interface UploadedFile {
  id: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}
interface QueuedFile {
  localId: string;
  file: File;
  previewUrl?: string;
  progress: number;
  error?: string;
}
interface UploadConfig {
  uploads?: { maxFiles: number; maxFileSizeBytes: number; allowedMimeTypes: string[] };
}
interface Props {
  expenseId: string;
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  initialFiles?: File[];
}

const FALLBACK_CONFIG = {
  maxFiles: 5,
  maxFileSizeBytes: 15 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'],
};

export function AttachmentUploader({
  expenseId,
  onFilesChange,
  maxFiles,
  disabled = false,
  initialFiles = [],
}: Props): JSX.Element {
  const { showToast } = useToast();
  const [config, setConfig] = useState(FALLBACK_CONFIG);
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const initialHandled = useRef(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void apiFetch<UploadConfig>('/app/config')
      .then((value) => value.uploads && setConfig(value.uploads))
      .catch(() => undefined);
  }, []);

  const actualMax = maxFiles ?? config.maxFiles;
  const updateUploaded = (next: UploadedFile[]) => {
    setUploaded(next);
    onFilesChange(next);
  };

  const putWithProgress = (url: string, file: File, localId: string) =>
    new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('PUT', url);
      request.setRequestHeader('Content-Type', file.type);
      request.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.max(1, Math.min(95, Math.round((event.loaded / event.total) * 95)));
        setQueue((items) =>
          items.map((item) => (item.localId === localId ? { ...item, progress } : item)),
        );
      };
      request.onload = () =>
        request.status >= 200 && request.status < 300
          ? resolve()
          : reject(new Error('R2 yüklemesi başarısız.'));
      request.onerror = () => reject(new Error('Dosya aktarımı sırasında bağlantı kesildi.'));
      request.send(file);
    });

  const uploadOne = async (queued: QueuedFile) => {
    const { file, localId } = queued;
    setQueue((items) =>
      items.map((item) =>
        item.localId === localId ? { ...item, progress: 0, error: undefined } : item,
      ),
    );
    try {
      const signed = await apiFetch<{ uploadUrl: string; fileKey: string }>(
        '/attachments/upload-url',
        {
          method: 'POST',
          body: { expenseId, fileName: file.name, mimeType: file.type, fileSize: file.size },
        },
      );
      await putWithProgress(signed.uploadUrl, file, localId);
      const completed = await apiFetch<UploadedFile>('/attachments/complete', {
        method: 'POST',
        body: {
          expenseId,
          fileKey: signed.fileKey,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        },
      });
      setQueue((items) => items.filter((item) => item.localId !== localId));
      setUploaded((items) => {
        const next = [...items, completed];
        onFilesChange(next);
        return next;
      });
      if (queued.previewUrl) URL.revokeObjectURL(queued.previewUrl);
    } catch (error) {
      setQueue((items) =>
        items.map((item) =>
          item.localId === localId
            ? { ...item, progress: 0, error: getApiErrorMessage(error, 'Yükleme başarısız.') }
            : item,
        ),
      );
    }
  };

  const handleFiles = (selected: File[] | FileList | null) => {
    if (!selected) return;
    const capacity = actualMax - uploaded.length - queue.length;
    const candidates = Array.from(selected).slice(0, Math.max(0, capacity));
    if (Array.from(selected).length > capacity)
      showToast(`En fazla ${actualMax} belge eklenebilir.`, 'error');
    for (const file of candidates) {
      if (!config.allowedMimeTypes.includes(file.type)) {
        showToast(`${file.name}: desteklenmeyen dosya türü.`, 'error');
        continue;
      }
      if (file.size > config.maxFileSizeBytes) {
        showToast(
          `${file.name}: dosya boyutu ${(config.maxFileSizeBytes / 1024 / 1024).toFixed(0)} MB sınırını aşıyor.`,
          'error',
        );
        continue;
      }
      const queued: QueuedFile = {
        localId: crypto.randomUUID(),
        file,
        progress: 0,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      };
      setQueue((items) => [...items, queued]);
      void uploadOne(queued);
    }
  };

  useEffect(() => {
    if (initialHandled.current || initialFiles.length === 0) return;
    initialHandled.current = true;
    handleFiles(initialFiles);
    // Initial files are intentionally consumed only once after the draft receives an id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseId]);

  const removeQueued = (item: QueuedFile) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    setQueue((items) => items.filter((candidate) => candidate.localId !== item.localId));
  };
  const deleteUploaded = async (item: UploadedFile) => {
    try {
      await apiFetch(`/attachments/${item.id}`, { method: 'DELETE' });
      updateUploaded(uploaded.filter((file) => file.id !== item.id));
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Belge silinemedi.'), 'error');
    }
  };
  const canUpload = !disabled && uploaded.length + queue.length < actualMax;

  return (
    <section className="attachment-uploader" aria-label="Masraf belgeleri">
      <input
        ref={cameraRef}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        aria-label="Kamerayla fotoğraf çek"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={galleryRef}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        aria-label="Galeriden görsel seç"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={fileRef}
        className="visually-hidden"
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        multiple
        aria-label="PDF veya dosya seç"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {canUpload && (
        <div className="attachment-action-row">
          <button
            type="button"
            className="upload-action-btn"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera size={20} />
            <span>Fotoğraf çek</span>
          </button>
          <button
            type="button"
            className="upload-action-btn"
            onClick={() => galleryRef.current?.click()}
          >
            <Image size={20} />
            <span>Galeri</span>
          </button>
          <button
            type="button"
            className="upload-action-btn"
            onClick={() => fileRef.current?.click()}
          >
            <FileText size={20} />
            <span>Manuel</span>
          </button>
          <small className="attachment-count">
            {uploaded.length + queue.length}/{actualMax} belge
          </small>
        </div>
      )}

      <div className="attachment-list">
        {queue.map((item) => (
          <ExpenseAttachmentPreview
            key={item.localId}
            name={item.file.name}
            size={item.file.size}
            previewUrl={item.previewUrl}
            progress={item.progress}
            error={item.error}
            onDelete={() => removeQueued(item)}
            onRetry={() => void uploadOne(item)}
          />
        ))}
        {uploaded.map((item) => (
          <ExpenseAttachmentPreview
            key={item.id}
            name={item.fileName}
            size={item.sizeBytes}
            complete
            onDelete={disabled ? undefined : () => void deleteUploaded(item)}
          />
        ))}
      </div>
      <p className="attachment-help">
        JPG, PNG, WEBP veya PDF · dosya başına en fazla{' '}
        {(config.maxFileSizeBytes / 1024 / 1024).toFixed(0)} MB
      </p>
    </section>
  );
}

export const ExpenseAttachmentUploader = AttachmentUploader;

export function ExpenseAttachmentPreview({
  name,
  size,
  previewUrl,
  progress,
  error,
  complete,
  onDelete,
  onRetry,
}: {
  name: string;
  size: number;
  previewUrl?: string;
  progress?: number;
  error?: string;
  complete?: boolean;
  onDelete?: () => void;
  onRetry?: () => void;
}) {
  return (
    <article className={`attachment-preview ${error ? 'has-error' : ''}`}>
      <span className="attachment-thumbnail">
        {previewUrl ? <img src={previewUrl} alt="" /> : <FileText />}
      </span>
      <div className="attachment-meta">
        <strong title={name}>{name}</strong>
        <small>
          {formatBytes(size)}
          {complete ? ' · Yüklendi' : ''}
        </small>
        {!complete && !error && (
          <div className="upload-progress">
            <span style={{ width: `${progress ?? 0}%` }} />
          </div>
        )}
        {error && <span role="alert">{error}</span>}
      </div>
      {error && onRetry && (
        <button
          type="button"
          className="attachment-icon-button"
          aria-label={`${name} dosyasını yeniden dene`}
          onClick={onRetry}
        >
          <RefreshCw />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="attachment-icon-button"
          aria-label={`${name} dosyasını sil`}
          onClick={onDelete}
        >
          <Trash2 />
        </button>
      )}
    </article>
  );
}

function formatBytes(value: number) {
  return value >= 1024 * 1024
    ? `${(value / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(value / 1024)} KB`;
}
