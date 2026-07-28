import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAttachmentUploads } from './useAttachmentUploads';

import type * as ApiClient from '@/lib/api-client';

const apiFetch = vi.hoisted(() => vi.fn());
const refreshAccessToken = vi.hoisted(() => vi.fn().mockResolvedValue(false));
vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof ApiClient>('@/lib/api-client');
  return { ...actual, apiFetch, refreshAccessToken, getAccessToken: () => 'test-token' };
});

let uploadCallCount = 0;
let shouldFail = false;

/** Backend'e giden tek multipart `/attachments/upload` POST'unu taklit eder. */
class MockXhr {
  upload = { onprogress: null as ((ev: ProgressEvent) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  status = 0;
  responseText = '';
  timeout = 0;
  withCredentials = false;
  open = vi.fn();
  setRequestHeader = vi.fn();
  send = vi.fn(() => {
    queueMicrotask(() => {
      this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent);
      queueMicrotask(() => {
        if (shouldFail) {
          this.status = 502;
          this.responseText = JSON.stringify({
            code: 'STORAGE_UPLOAD_FAILED',
            message: 'R2 down',
          });
        } else {
          uploadCallCount += 1;
          this.status = 201;
          this.responseText = JSON.stringify({
            id: `att-${uploadCallCount}`,
            fileKey: 'attachments/org/abc.jpg',
            fileName: 'fatura.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 3,
          });
        }
        this.onload?.();
      });
    });
  });
}

function makeFile(name = 'fatura.jpg', type = 'image/jpeg') {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

const options = { maxFiles: 5, maxFileSizeBytes: 15 * 1024 * 1024 };

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue(undefined);
  refreshAccessToken.mockClear();
  uploadCallCount = 0;
  shouldFail = false;
  vi.stubGlobal('XMLHttpRequest', MockXhr);
  // jsdom bu ikisini tanımlamaz; statik metot oldukları için spread ile kopyalanmaz.
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useAttachmentUploads', () => {
  it('masraf taslağı yokken dosyaları bekletir, ağa çıkmaz', async () => {
    const { result } = renderHook(() => useAttachmentUploads(options));

    act(() => {
      result.current.addFiles([makeFile()]);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]!.status).toBe('waiting');
    expect(uploadCallCount).toBe(0);
  });

  it('taslak varken dosya seçimi anında yüklemeyi başlatır', async () => {
    const { result } = renderHook(() => useAttachmentUploads(options));

    act(() => {
      result.current.attachExpense('exp-1');
    });
    act(() => {
      result.current.addFiles([makeFile()]);
    });

    // "Taslak olarak kaydet" hiç tıklanmadan yükleme tamamlanmalı.
    await waitFor(() => expect(result.current.items[0]!.status).toBe('done'));
    expect(result.current.items[0]!.progress).toBe(100);
    expect(result.current.items[0]!.uploaded?.id).toBe('att-1');
  });

  it('flush() tek çağrıda bekleyen yüklemeleri başlatıp bitmelerini bekler', async () => {
    const { result } = renderHook(() => useAttachmentUploads(options));

    act(() => {
      result.current.addFiles([makeFile('a.jpg'), makeFile('b.pdf', 'application/pdf')]);
    });
    expect(result.current.items.every((i) => i.status === 'waiting')).toBe(true);

    // Kullanıcının TEK tıklaması: flush çözüldüğünde sonuçlar hazır olmalı —
    // ikinci bir tıklamaya veya state güncellemesini beklemeye gerek yok.
    let flushed: Awaited<ReturnType<typeof result.current.flush>> | undefined;
    await act(async () => {
      flushed = await result.current.flush('exp-1');
    });

    expect(flushed!.failed).toHaveLength(0);
    expect(flushed!.uploaded).toHaveLength(2);
    expect(flushed!.uploaded.map((f) => f.id)).toEqual(['att-1', 'att-2']);
  });

  it('flush() aynı dosya için ikinci bir yükleme başlatmaz', async () => {
    const { result } = renderHook(() => useAttachmentUploads(options));

    act(() => {
      result.current.attachExpense('exp-1');
      result.current.addFiles([makeFile()]);
    });
    await waitFor(() => expect(result.current.items[0]!.status).toBe('done'));

    const callsBefore = uploadCallCount;
    await act(async () => {
      await result.current.flush('exp-1');
    });
    expect(uploadCallCount).toBe(callsBefore);
  });

  it('başarısız yükleme flush() sonucunda failed olarak raporlanır', async () => {
    shouldFail = true;
    const { result } = renderHook(() => useAttachmentUploads(options));
    act(() => {
      result.current.addFiles([makeFile()]);
    });

    let flushed: Awaited<ReturnType<typeof result.current.flush>> | undefined;
    await act(async () => {
      flushed = await result.current.flush('exp-1');
    });

    expect(flushed!.uploaded).toHaveLength(0);
    expect(flushed!.failed).toHaveLength(1);
    expect(result.current.items[0]!.status).toBe('error');
    expect(result.current.items[0]!.error).toContain('STORAGE_UPLOAD_FAILED');
  });
});
