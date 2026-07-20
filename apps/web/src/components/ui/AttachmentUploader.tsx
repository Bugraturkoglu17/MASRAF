import { Camera, FileText, Image, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { apiFetch } from '@/lib/api-client';

interface UploadedFile {
  id: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

interface UploadingFile {
  localId: string;
  fileName: string;
  progress: number;
  error?: string;
}

interface AttachmentUploaderProps {
  expenseId: string;
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function AttachmentUploader({
  expenseId,
  onFilesChange,
  maxFiles = 5,
  disabled = false,
}: AttachmentUploaderProps): JSX.Element {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [showOptions, setShowOptions] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateUploaded = (files: UploadedFile[]) => {
    setUploadedFiles(files);
    onFilesChange(files);
  };

  const canUploadMore = uploadedFiles.length + uploadingFiles.length < maxFiles;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setShowOptions(false);

    const toProcess = Array.from(files).slice(
      0,
      maxFiles - uploadedFiles.length - uploadingFiles.length,
    );

    for (const file of toProcess) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`${file.name}: Desteklenmeyen dosya türü.`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        alert(`${file.name}: Dosya boyutu 10 MB'ı aşıyor.`);
        continue;
      }

      const localId = `${Date.now()}-${Math.random()}`;
      setUploadingFiles((prev) => [...prev, { localId, fileName: file.name, progress: 0 }]);

      try {
        const { uploadUrl, fileKey } = await apiFetch<{ uploadUrl: string; fileKey: string }>(
          '/attachments/upload-url',
          {
            method: 'POST',
            body: { expenseId, fileName: file.name, mimeType: file.type, fileSize: file.size },
          },
        );

        setUploadingFiles((prev) =>
          prev.map((f) => (f.localId === localId ? { ...f, progress: 30 } : f)),
        );

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (!uploadRes.ok) throw new Error('R2 yüklemesi başarısız');

        setUploadingFiles((prev) =>
          prev.map((f) => (f.localId === localId ? { ...f, progress: 80 } : f)),
        );

        const completed = await apiFetch<UploadedFile>('/attachments/complete', {
          method: 'POST',
          body: {
            expenseId,
            fileKey,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
          },
        });

        setUploadingFiles((prev) => prev.filter((f) => f.localId !== localId));
        setUploadedFiles((prev) => {
          const next = [...prev, completed];
          onFilesChange(next);
          return next;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Yükleme başarısız';
        setUploadingFiles((prev) =>
          prev.map((f) => (f.localId === localId ? { ...f, progress: 0, error: message } : f)),
        );
      }
    }
  };

  const retryUpload = (localId: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.localId !== localId));
  };

  const deleteFile = async (fileId: string) => {
    await apiFetch(`/attachments/${fileId}`, { method: 'DELETE' });
    const next = uploadedFiles.filter((f) => f.id !== fileId);
    updateUploaded(next);
  };

  type UploadKind = 'camera' | 'gallery' | 'file';

  const triggerUpload = (kind: UploadKind) => {
    if (kind === 'camera') cameraRef.current?.click();
    else if (kind === 'gallery') galleryRef.current?.click();
    else fileRef.current?.click();
  };

  const uploadOptions: {
    kind: UploadKind;
    icon: JSX.Element;
    label: string;
    sub: string;
    color: string;
    bg: string;
  }[] = [
    {
      kind: 'camera',
      icon: <Camera size={22} />,
      label: 'Fotoğraf Çek',
      sub: 'Kamerayla belge çek',
      color: '#2563eb',
      bg: '#eff6ff',
    },
    {
      kind: 'gallery',
      icon: <Image size={22} />,
      label: 'Galeriden Seç',
      sub: 'Telefonundan görsel seç',
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
    {
      kind: 'file',
      icon: <FileText size={22} />,
      label: 'PDF / Dosya Yükle',
      sub: 'PDF veya Excel seç',
      color: '#dc2626',
      bg: '#fef2f2',
    },
  ];

  return (
    <div>
      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.xlsx,.xls"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Upload options toggle */}
      {canUploadMore && !disabled && (
        <button
          type="button"
          onClick={() => setShowOptions((s) => !s)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            border: '1.5px dashed var(--color-border)',
            background: showOptions ? 'var(--color-bg)' : 'transparent',
            cursor: 'pointer',
            color: 'var(--color-primary)',
            fontSize: 14,
            fontWeight: 500,
            transition: 'background 0.15s',
          }}
        >
          <Plus size={16} />
          Belge Ekle
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
            {uploadedFiles.length}/{maxFiles}
          </span>
        </button>
      )}

      {/* Option cards */}
      {showOptions && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10 }}>
          {uploadOptions.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => triggerUpload(opt.kind)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '14px 8px',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
                background: opt.bg,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <span style={{ color: opt.color }}>{opt.icon}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  lineHeight: 1.2,
                }}
              >
                {opt.label}
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', lineHeight: 1.2 }}>
                {opt.sub}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Uploading in-progress */}
      {uploadingFiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {uploadingFiles.map((f) => (
            <div
              key={f.localId}
              style={{
                background: 'var(--color-bg)',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: f.error ? 6 : 4,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '75%',
                  }}
                >
                  {f.fileName}
                </span>
                {f.error ? (
                  <button
                    type="button"
                    onClick={() => retryUpload(f.localId)}
                    style={{
                      fontSize: 11,
                      color: 'var(--color-danger)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Tekrar Dene
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                    {f.progress}%
                  </span>
                )}
              </div>
              {f.error ? (
                <div style={{ fontSize: 12, color: 'var(--color-danger)' }}>{f.error}</div>
              ) : (
                <div style={{ height: 3, background: 'var(--color-border)', borderRadius: 2 }}>
                  <div
                    style={{
                      height: '100%',
                      background: 'var(--color-primary)',
                      borderRadius: 2,
                      width: `${f.progress}%`,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {uploadedFiles.map((f) => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'var(--color-approved-bg)',
                borderRadius: 8,
                border: '1px solid var(--color-approved-border)',
              }}
            >
              <FileText size={14} color="var(--color-approved)" />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.fileName}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {(f.sizeBytes / 1024).toFixed(0)} KB
                </div>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => deleteFile(f.id)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: '1px solid var(--color-danger-border)',
                    background: 'var(--color-danger-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={13} color="var(--color-danger)" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
