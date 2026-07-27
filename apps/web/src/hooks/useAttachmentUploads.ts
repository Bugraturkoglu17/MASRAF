import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, apiFetch, getApiErrorMessage } from '@/lib/api-client';
import {
  getAttachmentMimeType,
  getAttachmentValidationError,
  getUploadTimeoutMs,
} from '@/lib/attachment-validation';

export interface UploadedFile {
  id: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * waiting   → kuyrukta; masraf taslağı henüz oluşmadığı için yükleme başlayamadı
 * uploading → imzalı URL alındı / R2'ye aktarım sürüyor
 * done      → /attachments/complete döndü, attachment kaydı ve storage key hazır
 * error     → yükleme başarısız, yeniden denenebilir
 */
export type UploadStatus = 'waiting' | 'uploading' | 'done' | 'error';

export interface UploadItem {
  localId: string;
  file: File;
  mimeType: string;
  previewUrl?: string;
  progress: number;
  status: UploadStatus;
  error?: string;
  uploaded?: UploadedFile;
}

interface Options {
  maxFiles: number;
  maxFileSizeBytes: number;
  onError?: (message: string) => void;
}

class StorageUploadError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function getStorageHttpError(status: number): StorageUploadError {
  if (status === 400)
    return new StorageUploadError(
      'R2_BAD_REQUEST',
      'Depolama isteği reddedildi. Dosya türü veya imzalı URL geçersiz.',
    );
  if (status === 401 || status === 403)
    return new StorageUploadError(
      'R2_ACCESS_DENIED',
      'Depolama servisi yükleme yetkisini reddetti.',
    );
  if (status === 404)
    return new StorageUploadError(
      'R2_BUCKET_NOT_FOUND',
      'Depolama alanı bulunamadı veya endpoint hatalı.',
    );
  if (status >= 500)
    return new StorageUploadError(
      'R2_UNAVAILABLE',
      'Depolama servisi geçici olarak yanıt veremiyor.',
    );
  return new StorageUploadError(
    'R2_UPLOAD_REJECTED',
    `Depolama servisi yüklemeyi reddetti (HTTP ${status}).`,
  );
}

function getUploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return `${error.message} (${error.code})`;
  if (error instanceof StorageUploadError) return `${error.message} (${error.code})`;
  return getApiErrorMessage(error, 'Yükleme başarısız. (UPLOAD_UNKNOWN)');
}

/**
 * Yükleme kuyruğunu state ve ref olarak birlikte tutar; ikisi commit() ile
 * daima aynı anda güncellenir. State render içindir, ref ise senkron okuma.
 *
 * Kritik nokta: `flush()` çağrıldığında kuyruğun güncel hâli `itemsRef.current`
 * üzerinden **senkron** okunur. Böylece "kaydet" akışı, React state güncellemesini
 * beklemek için ikinci bir kullanıcı tıklamasına ihtiyaç duymaz — stale state ve
 * upload/save yarış durumu bu tasarımla ortadan kalkar.
 */
export function useAttachmentUploads({ maxFiles, maxFileSizeBytes, onError }: Options) {
  // `items` render içindir; `itemsRef` ise aynı verinin senkron okunabilen
  // aynasıdır. flush() bu ayna sayesinde state güncellemesini beklemeden
  // güncel sonucu okur. İkisi her zaman commit() ile birlikte güncellenir.
  const [items, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef<UploadItem[]>([]);

  const expenseIdRef = useRef<string | null>(null);
  const inFlightRef = useRef(new Map<string, Promise<void>>());
  const previewUrlsRef = useRef(new Set<string>());
  const optsRef = useRef({ maxFiles, maxFileSizeBytes, onError });

  useEffect(() => {
    optsRef.current = { maxFiles, maxFileSizeBytes, onError };
  });

  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const commit = useCallback((next: UploadItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const patch = useCallback(
    (localId: string, changes: Partial<UploadItem>) => {
      commit(
        itemsRef.current.map((item) => (item.localId === localId ? { ...item, ...changes } : item)),
      );
    },
    [commit],
  );

  // ── R2'ye doğrudan aktarım (gerçek ilerleme ile) ───────────────────────────

  const putWithProgress = useCallback(
    (url: string, file: File, mimeType: string, localId: string, timeoutMs: number) =>
      new Promise<void>((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.open('PUT', url);
        req.setRequestHeader('Content-Type', mimeType);
        req.timeout = timeoutMs;
        req.upload.onprogress = (ev) => {
          if (!ev.lengthComputable) return;
          // 95'te tutulur; %100 yalnızca /complete başarılı olduğunda gösterilir.
          const pct = Math.max(1, Math.min(95, Math.round((ev.loaded / ev.total) * 95)));
          patch(localId, { progress: pct });
        };
        req.onload = () =>
          req.status >= 200 && req.status < 300
            ? resolve()
            : reject(getStorageHttpError(req.status));
        req.onerror = () =>
          reject(
            new StorageUploadError(
              'R2_CORS_OR_NETWORK',
              'Depolama servisine ulaşılamadı. Ağ bağlantısı veya R2 CORS ayarı geçersiz.',
            ),
          );
        req.ontimeout = () =>
          reject(
            new StorageUploadError(
              'R2_UPLOAD_TIMEOUT',
              'Dosya yükleme bağlantısı zaman aşımına uğradı.',
            ),
          );
        req.send(file);
      }),
    [patch],
  );

  const runUpload = useCallback(
    async (localId: string) => {
      const expenseId = expenseIdRef.current;
      const item = itemsRef.current.find((i) => i.localId === localId);
      if (!expenseId || !item || item.status === 'done') return;

      patch(localId, { status: 'uploading', progress: 0, error: undefined });
      try {
        const signed = await apiFetch<{
          uploadUrl: string;
          fileKey: string;
          expiresIn: number;
        }>('/attachments/upload-url', {
          method: 'POST',
          body: {
            expenseId,
            fileName: item.file.name,
            mimeType: item.mimeType,
            fileSize: item.file.size,
          },
        });

        await putWithProgress(
          signed.uploadUrl,
          item.file,
          item.mimeType,
          localId,
          getUploadTimeoutMs(signed.expiresIn),
        );

        // Attachment kaydı ve storage key hazır olmadan dosya "Yüklendi" sayılmaz.
        const completed = await apiFetch<UploadedFile>('/attachments/complete', {
          method: 'POST',
          body: {
            expenseId,
            fileKey: signed.fileKey,
            fileName: item.file.name,
            mimeType: item.mimeType,
            fileSize: item.file.size,
          },
        });

        patch(localId, {
          status: 'done',
          progress: 100,
          uploaded: completed,
          error: undefined,
        });
      } catch (error) {
        patch(localId, {
          status: 'error',
          progress: 0,
          error: getUploadErrorMessage(error),
        });
      }
    },
    [patch, putWithProgress],
  );

  /** Aynı dosya için ikinci bir yükleme başlatılmasını engeller. */
  const start = useCallback(
    (localId: string) => {
      if (inFlightRef.current.has(localId)) return;
      const promise = runUpload(localId).finally(() => {
        inFlightRef.current.delete(localId);
      });
      inFlightRef.current.set(localId, promise);
    },
    [runUpload],
  );

  const startWaiting = useCallback(() => {
    if (!expenseIdRef.current) return;
    for (const item of itemsRef.current) {
      if (item.status === 'waiting') start(item.localId);
    }
  }, [start]);

  // ── Dış API ────────────────────────────────────────────────────────────────

  /** Masraf taslağı oluştuğunda çağrılır; bekleyen dosyaların yüklemesini başlatır. */
  const attachExpense = useCallback(
    (expenseId: string) => {
      expenseIdRef.current = expenseId;
      startWaiting();
    },
    [startWaiting],
  );

  /**
   * Dosya seçildiği anda çağrılır. Masraf taslağı zaten varsa yükleme hemen başlar;
   * yoksa dosya `waiting` durumunda kuyruğa alınır ve taslak oluşur oluşmaz başlar.
   */
  const addFiles = useCallback(
    (files: File[]): boolean => {
      const { maxFiles: max, maxFileSizeBytes: maxSize, onError: reportError } = optsRef.current;
      const current = itemsRef.current;
      const capacity = max - current.length;

      if (files.length > capacity) {
        reportError?.(`En fazla ${max} belge eklenebilir.`);
        if (capacity <= 0) return false;
      }

      const accepted: UploadItem[] = [];
      for (const file of files.slice(0, Math.max(0, capacity))) {
        const validationError = getAttachmentValidationError(file, maxSize);
        if (validationError) {
          reportError?.(validationError);
          continue;
        }
        const mimeType = getAttachmentMimeType(file)!;
        const previewUrl = mimeType.startsWith('image/') ? URL.createObjectURL(file) : undefined;
        if (previewUrl) previewUrlsRef.current.add(previewUrl);
        accepted.push({
          localId: crypto.randomUUID(),
          file,
          mimeType,
          previewUrl,
          progress: 0,
          status: 'waiting',
        });
      }

      if (accepted.length === 0) return false;
      commit([...current, ...accepted]);
      // Taslak varsa yükleme dosya seçimi anında başlar.
      if (expenseIdRef.current) {
        for (const item of accepted) start(item.localId);
      }
      return true;
    },
    [commit, start],
  );

  const retry = useCallback(
    (localId: string) => {
      const item = itemsRef.current.find((i) => i.localId === localId);
      if (!item || item.status === 'done') return;
      patch(localId, { status: 'waiting', progress: 0, error: undefined });
      if (expenseIdRef.current) start(localId);
    },
    [patch, start],
  );

  const remove = useCallback(
    async (localId: string) => {
      const item = itemsRef.current.find((i) => i.localId === localId);
      if (!item) return;
      if (item.status === 'done' && item.uploaded) {
        try {
          await apiFetch(`/attachments/${item.uploaded.id}`, { method: 'DELETE' });
        } catch (error) {
          optsRef.current.onError?.(getApiErrorMessage(error, 'Belge silinemedi.'));
          return;
        }
      }
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
        previewUrlsRef.current.delete(item.previewUrl);
      }
      commit(itemsRef.current.filter((i) => i.localId !== localId));
    },
    [commit],
  );

  /** Düzenleme modunda sunucudaki mevcut ekleri kuyruğa yansıtır. */
  const hydrate = useCallback(
    (existing: UploadedFile[]) => {
      const knownIds = new Set(
        itemsRef.current.map((item) => item.uploaded?.id).filter(Boolean) as string[],
      );
      const additions = existing
        .filter((file) => !knownIds.has(file.id))
        .map<UploadItem>((file) => ({
          localId: crypto.randomUUID(),
          file: new File([], file.fileName, { type: file.mimeType }),
          mimeType: file.mimeType,
          progress: 100,
          status: 'done',
          uploaded: file,
        }));
      if (additions.length === 0) return;
      commit([...itemsRef.current, ...additions]);
    },
    [commit],
  );

  /**
   * "Taslak olarak kaydet" akışının kalbi.
   *
   * Bekleyen dosyaların yüklemesini başlatır ve **hepsi bitene kadar bekler**;
   * ardından kuyruğu ref üzerinden senkron okuyup sonucu döndürür. Kullanıcının
   * ikinci kez butona basmasına gerek kalmaz.
   */
  const flush = useCallback(
    async (expenseId: string): Promise<{ uploaded: UploadedFile[]; failed: UploadItem[] }> => {
      expenseIdRef.current = expenseId;
      startWaiting();

      // Yükleme sırasında yeni iş kuyruğa girebileceği için boşalana kadar döner.
      while (inFlightRef.current.size > 0) {
        await Promise.all([...inFlightRef.current.values()]);
      }

      const items = itemsRef.current;
      return {
        uploaded: items
          .filter((item) => item.status === 'done' && item.uploaded)
          .map((item) => item.uploaded!),
        failed: items.filter((item) => item.status === 'error'),
      };
    },
    [startWaiting],
  );

  return {
    items,
    addFiles,
    attachExpense,
    flush,
    hydrate,
    remove,
    retry,
    isUploading: items.some((item) => item.status === 'uploading' || item.status === 'waiting'),
    hasFailed: items.some((item) => item.status === 'error'),
    doneCount: items.filter((item) => item.status === 'done').length,
  };
}

export type AttachmentUploads = ReturnType<typeof useAttachmentUploads>;
