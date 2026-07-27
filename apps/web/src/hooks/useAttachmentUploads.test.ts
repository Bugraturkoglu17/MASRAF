import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAttachmentUploads } from './useAttachmentUploads';

import type * as ApiClient from '@/lib/api-client';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof ApiClient>('@/lib/api-client');
  return { ...actual, apiFetch };
});

/** R2'ye yapılan PUT'u taklit eder; her örnek anında başarıyla tamamlanır. */
class MockXhr {
  upload = { onprogress: null as ((ev: ProgressEvent) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  status = 200;
  timeout = 0;
  open = vi.fn();
  setRequestHeader = vi.fn();
  send = vi.fn(() => {
    queueMicrotask(() => {
      this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent);
      this.onload?.();
    });
  });
}

function makeFile(name = 'fatura.jpg', type = 'image/jpeg') {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

function setupApi() {
  apiFetch.mockImplementation((path: string) => {
    if (path === '/attachments/upload-url') {
      return Promise.resolve({
        uploadUrl: 'https://r2.example.com/signed',
        fileKey: 'attachments/org/abc.jpg',
        expiresIn: 900,
      });
    }
    if (path === '/attachments/complete') {
      return Promise.resolve({
        id: `att-${apiFetch.mock.calls.filter((c) => c[0] === '/attachments/complete').length}`,
        fileKey: 'attachments/org/abc.jpg',
        fileName: 'fatura.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 3,
      });
    }
    return Promise.resolve({});
  });
}

const options = { maxFiles: 5, maxFileSizeBytes: 15 * 1024 * 1024 };

beforeEach(() => {
  apiFetch.mockReset();
  setupApi();
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
    expect(apiFetch).not.toHaveBeenCalled();
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

    const completeCallsBefore = apiFetch.mock.calls.filter(
      (c) => c[0] === '/attachments/complete',
    ).length;

    await act(async () => {
      await result.current.flush('exp-1');
    });

    const completeCallsAfter = apiFetch.mock.calls.filter(
      (c) => c[0] === '/attachments/complete',
    ).length;
    expect(completeCallsAfter).toBe(completeCallsBefore);
  });

  it('başarısız yükleme flush() sonucunda failed olarak raporlanır', async () => {
    apiFetch.mockImplementation((path: string) => {
      if (path === '/attachments/upload-url') return Promise.reject(new Error('R2 down'));
      return Promise.resolve({});
    });

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
  });
});
