import { Camera, Eye, FileText, ImagePlus, RefreshCw, RepeatIcon, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ImageEditor } from './ImageEditor';

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

interface EditorState {
  file: File;
  inputRef: React.RefObject<HTMLInputElement>;
  replaceId?: string;
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
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const initialHandled = useRef(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceTargetId = useRef<string | null>(null);
  const previewUrlMap = useRef(new Map<string, string>());

  useEffect(() => {
    const map = previewUrlMap.current;
    return () => {
      map.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    void apiFetch<UploadConfig>('/app/config')
      .then((v) => v.uploads && setConfig(v.uploads))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!expenseId) return;
    void apiFetch<UploadedFile[]>(`/attachments/expense/${expenseId}`)
      .then((files) => {
        if (!files.length) return;
        setUploaded((cur) => {
          const ids = new Set(cur.map((f) => f.id));
          return [...cur, ...files.filter((f) => !ids.has(f.id))];
        });
      })
      .catch(() => undefined);
  }, [expenseId]);

  const actualMax = maxFiles ?? config.maxFiles;

  useEffect(() => {
    onFilesChange(uploaded);
  }, [uploaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upload helpers ────────────────────────────────────────────────────────

  const putWithProgress = (url: string, file: File, localId: string) =>
    new Promise<void>((resolve, reject) => {
      const req = new XMLHttpRequest();
      req.open('PUT', url);
      req.setRequestHeader('Content-Type', file.type);
      req.upload.onprogress = (ev) => {
        if (!ev.lengthComputable) return;
        const pct = Math.max(1, Math.min(95, Math.round((ev.loaded / ev.total) * 95)));
        setQueue((items) =>
          items.map((i) => (i.localId === localId ? { ...i, progress: pct } : i)),
        );
      };
      req.onload = () =>
        req.status >= 200 && req.status < 300
          ? resolve()
          : reject(new Error('R2 yüklemesi başarısız.'));
      req.onerror = () => reject(new Error('Dosya aktarımı sırasında bağlantı kesildi.'));
      req.send(file);
    });

  const uploadOne = async (queued: QueuedFile) => {
    const { file, localId } = queued;
    setQueue((items) =>
      items.map((i) => (i.localId === localId ? { ...i, progress: 0, error: undefined } : i)),
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
      setQueue((items) => items.filter((i) => i.localId !== localId));
      if (queued.previewUrl) previewUrlMap.current.set(completed.id, queued.previewUrl);
      setUploaded((items) => [...items, completed]);
    } catch (error) {
      setQueue((items) =>
        items.map((i) =>
          i.localId === localId
            ? { ...i, progress: 0, error: getApiErrorMessage(error, 'Yükleme başarısız.') }
            : i,
        ),
      );
    }
  };

  const handleFiles = (files: File[]) => {
    const capacity = actualMax - uploaded.length - queue.length;
    const candidates = files.slice(0, Math.max(0, capacity));
    if (files.length > capacity) showToast(`En fazla ${actualMax} belge eklenebilir.`, 'error');
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

  // ── Initial files (from pending before draft save) ────────────────────────
  useEffect(() => {
    if (initialHandled.current || initialFiles.length === 0) return;
    initialHandled.current = true;
    handleFiles(initialFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseId]);

  // ── Delete ────────────────────────────────────────────────────────────────

  const removeQueued = (item: QueuedFile) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    setQueue((items) => items.filter((i) => i.localId !== item.localId));
  };

  const deleteUploaded = async (item: UploadedFile) => {
    try {
      await apiFetch(`/attachments/${item.id}`, { method: 'DELETE' });
      const url = previewUrlMap.current.get(item.id);
      if (url) {
        URL.revokeObjectURL(url);
        previewUrlMap.current.delete(item.id);
      }
      setUploaded((items) => items.filter((f) => f.id !== item.id));
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Belge silinemedi.'), 'error');
    }
  };

  // ── File selection → editor flow ──────────────────────────────────────────

  const onFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    inputRef: React.RefObject<HTMLInputElement>,
    replaceId?: string,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type.startsWith('image/')) {
      setEditor({ file, inputRef, replaceId });
    } else {
      // PDF or non-image: upload directly without editor
      if (replaceId) {
        const old = uploaded.find((u) => u.id === replaceId);
        if (old) void deleteUploaded(old);
      }
      handleFiles([file]);
    }
  };

  const handleEditorSave = (edited: File) => {
    const { replaceId } = editor!;
    setEditor(null);
    if (replaceId) {
      const old = uploaded.find((u) => u.id === replaceId);
      if (old) void deleteUploaded(old);
    }
    handleFiles([edited]);
  };

  const handleEditorReselect = () => {
    const inputRef = editor?.inputRef;
    setEditor(null);
    setTimeout(() => inputRef?.current?.click(), 80);
  };

  // ── Lightbox ──────────────────────────────────────────────────────────────

  const openLightbox = async (item: UploadedFile) => {
    const local = previewUrlMap.current.get(item.id);
    if (local) {
      setLightbox(local);
      return;
    }
    try {
      const { url } = await apiFetch<{ url: string }>(`/attachments/${item.id}/download-url`);
      setLightbox(url);
    } catch {
      showToast('Önizleme yüklenemedi.', 'error');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const atMax = uploaded.length + queue.length >= actualMax;

  return (
    <>
      <section className="attachment-uploader" aria-label="Masraf belgeleri">
        {/* Hidden inputs */}
        <input
          ref={cameraRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={(e) => onFileInputChange(e, cameraRef)}
        />
        <input
          ref={galleryRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={(e) => onFileInputChange(e, galleryRef)}
        />
        <input
          ref={replaceRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => onFileInputChange(e, replaceRef, replaceTargetId.current ?? undefined)}
        />

        {/* Upload buttons — always visible */}
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
            {uploaded.length + queue.length}/{actualMax} belge
          </small>
        </div>

        {/* File list */}
        <div className="attachment-list">
          {queue.map((item) => (
            <AttachmentCard
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
            <AttachmentCard
              key={item.id}
              name={item.fileName}
              size={item.sizeBytes}
              mimeType={item.mimeType}
              attachmentId={item.id}
              previewUrl={previewUrlMap.current.get(item.id)}
              complete
              onDelete={disabled ? undefined : () => void deleteUploaded(item)}
              onView={
                item.mimeType.startsWith('image/') ? () => void openLightbox(item) : undefined
              }
              onReplace={
                disabled
                  ? undefined
                  : () => {
                      replaceTargetId.current = item.id;
                      replaceRef.current?.click();
                    }
              }
            />
          ))}
        </div>

        <p className="attachment-help">
          JPG, PNG, WEBP veya PDF · dosya başına en fazla{' '}
          {(config.maxFileSizeBytes / 1024 / 1024).toFixed(0)} MB
        </p>
      </section>

      {/* Image editor modal */}
      {editor && (
        <ImageEditor
          key={`${editor.file.name}-${editor.file.lastModified}`}
          file={editor.file}
          onSave={handleEditorSave}
          onCancel={() => setEditor(null)}
          onReselect={handleEditorReselect}
        />
      )}

      {/* Lightbox */}
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
            onClick={(e) => e.stopPropagation()}
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
  name,
  size,
  previewUrl,
  mimeType,
  attachmentId,
  progress,
  error,
  complete,
  onDelete,
  onRetry,
  onView,
  onReplace,
}: {
  name: string;
  size: number;
  previewUrl?: string;
  mimeType?: string;
  attachmentId?: string;
  progress?: number;
  error?: string;
  complete?: boolean;
  onDelete?: () => void;
  onRetry?: () => void;
  onView?: () => void;
  onReplace?: () => void;
}) {
  const [remoteUrl, setRemoteUrl] = useState<string>();
  useEffect(() => {
    if (previewUrl || !attachmentId || !mimeType?.startsWith('image/')) return;
    void apiFetch<{ url: string }>(`/attachments/${attachmentId}/download-url`)
      .then(({ url }) => setRemoteUrl(url))
      .catch(() => undefined);
  }, [previewUrl, attachmentId, mimeType]);
  const thumbSrc = previewUrl ?? remoteUrl;

  return (
    <article className={`attachment-preview ${error ? 'has-error' : ''}`}>
      <span
        className="attachment-thumbnail"
        style={onView ? { cursor: 'pointer' } : undefined}
        onClick={onView}
        role={onView ? 'button' : undefined}
        tabIndex={onView ? 0 : undefined}
        onKeyDown={onView ? (e) => e.key === 'Enter' && onView() : undefined}
        aria-label={onView ? `${name} önizle` : undefined}
      >
        {thumbSrc ? <img src={thumbSrc} alt="" /> : <FileText />}
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

      <div className="attachment-card-actions">
        {error && onRetry && (
          <button
            type="button"
            className="attachment-icon-button"
            aria-label="Yeniden dene"
            onClick={onRetry}
          >
            <RefreshCw size={14} />
          </button>
        )}
        {complete && onView && (
          <button
            type="button"
            className="attachment-icon-button"
            aria-label={`${name} görüntüle`}
            onClick={onView}
          >
            <Eye size={14} />
          </button>
        )}
        {complete && onReplace && (
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

// Keep old export name for callers in ExpenseDetailSheet
export { AttachmentCard as ExpenseAttachmentPreview };

function formatBytes(value: number) {
  return value >= 1024 * 1024
    ? `${(value / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(value / 1024)} KB`;
}
