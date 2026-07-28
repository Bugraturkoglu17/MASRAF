import { useCallback, useEffect, useRef, useState } from 'react';

import { apiFetch, getAccessToken, getApiErrorMessage, refreshAccessToken } from '@/lib/api-client';
import { getAttachmentMimeType, getAttachmentValidationError } from '@/lib/attachment-validation';

const API_BASE_URL = import.meta.env.VITE_API_URL as string;
const UPLOAD_TIMEOUT_MS = 180_000;

export interface UploadedFile {
  id: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * waiting   → kuyrukta; masraf taslağı henüz oluşmadığı için yükleme başlayamadı
 * uploading → dosya backend'e aktarılıyor (backend R2'ye server-to-server yazar)
 * done      → attachment kaydı ve storage key hazır
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

class UploadError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function parseUploadError(status: number, responseText: string): UploadError {
  try {
    const body = JSON.parse(responseText) as {
      code?: string;
      message?: string;
      requestId?: string;
    };
    const suffix = body.requestId ? ` (Talep: ${body.requestId})` : '';
    return new UploadError(
      body.code ?? 'UPLOAD_FAILED',
      `${body.message ?? 'Yükleme başarısız.'}${suffix}`,
    );
  } catch {
    return new UploadError('UPLOAD_FAILED', `Yükleme başarısız. (HTTP ${status})`);
  }
}

function getUploadErrorMessage(error: unknown): string {
  if (error instanceof UploadError) return `${error.message} (${error.code})`;
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

  // ── Backend üzerinden yükleme (gerçek ilerleme ile) ─────────────────────────
  //
  // Dosya, tarayıcıdan doğrudan R2'ye değil, aynı-origin backend'e (server-to-server
  // R2'ye yazan) tek bir multipart POST ile gönderilir. Önceki presigned-URL akışı
  // (tarayıcı → R2 doğrudan PUT) bazı istemcilerde (HTTP/3 üzerinden) Cloudflare R2
  // ile tutarsız CORS davranışı gösterdiği için terk edildi: R2 bucket CORS politikası
  // curl ile doğru şekilde doğrulanmasına rağmen gerçek tarayıcılarda (masaüstü test
  // aracı ve kullanıcının telefonu) yükleme tutarlı biçimde başarısız oluyordu. Backend
  // proxy'si bu sınıf sorunları yapısal olarak ortadan kaldırır: tarayıcı yalnızca zaten
  // çalışan aynı-origin API'ye konuşur, R2 bağlantısı tamamen sunucu tarafında kalır.

  const postFileWithProgress = useCallback(
    (expenseId: string, file: File, mimeType: string, localId: string) =>
      new Promise<UploadedFile>((resolve, reject) => {
        const attempt = (isRetry: boolean) => {
          // Doğrulanmış/normalize edilmiş mimeType, çıplak dosyanın (bazı tarayıcılarda
          // boş veya 'image/jpg' gibi normalize edilmemiş) .type değeri yerine gönderilir.
          const normalized =
            file.type === mimeType ? file : new File([file], file.name, { type: mimeType });
          const form = new FormData();
          form.append('expenseId', expenseId);
          form.append('file', normalized, file.name);

          const req = new XMLHttpRequest();
          req.open('POST', `${API_BASE_URL}/attachments/upload`);
          req.withCredentials = true;
          const token = getAccessToken();
          if (token) req.setRequestHeader('Authorization', `Bearer ${token}`);
          req.timeout = UPLOAD_TIMEOUT_MS;
          req.upload.onprogress = (ev) => {
            if (!ev.lengthComputable) return;
            // 95'te tutulur; %100 yalnızca sunucu yanıtı başarıyla dönünce gösterilir.
            const pct = Math.max(1, Math.min(95, Math.round((ev.loaded / ev.total) * 95)));
            patch(localId, { progress: pct });
          };
          req.onload = () => {
            if (req.status >= 200 && req.status < 300) {
              try {
                resolve(JSON.parse(req.responseText) as UploadedFile);
              } catch {
                reject(new UploadError('UPLOAD_BAD_RESPONSE', 'Sunucu yanıtı okunamadı.'));
              }
              return;
            }
            // Erişim jetonu süresi dolmuşsa bir kez yenileyip yeniden dener.
            if (req.status === 401 && !isRetry) {
              void refreshAccessToken().then((refreshed) => {
                if (refreshed) attempt(true);
                else reject(parseUploadError(req.status, req.responseText));
              });
              return;
            }
            reject(parseUploadError(req.status, req.responseText));
          };
          req.onerror = () =>
            reject(new UploadError('NETWORK_ERROR', 'Sunucuyla bağlantı kurulamadı.'));
          req.ontimeout = () =>
            reject(
              new UploadError('UPLOAD_TIMEOUT', 'Dosya yükleme bağlantısı zaman aşımına uğradı.'),
            );
          req.send(form);
        };
        attempt(false);
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
        const uploaded = await postFileWithProgress(expenseId, item.file, item.mimeType, localId);
        patch(localId, { status: 'done', progress: 100, uploaded, error: undefined });
      } catch (error) {
        patch(localId, {
          status: 'error',
          progress: 0,
          error: getUploadErrorMessage(error),
        });
      }
    },
    [patch, postFileWithProgress],
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
