import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiFetch, getAccessToken, setAccessToken } from './api-client';

describe('apiFetch', () => {
  beforeEach(() => {
    setAccessToken(null);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('başarılı yanıtta JSON gövdesini döner', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ hello: 'world' }),
    });

    const result = await apiFetch<{ hello: string }>('/test');
    expect(result).toEqual({ hello: 'world' });
  });

  it('hata yanıtında ApiError fırlatır ve requestId taşır', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Geçersiz istek',
        requestId: 'req-1',
      }),
    });

    await expect(apiFetch('/test')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      requestId: 'req-1',
    });
  });

  it('setAccessToken ile jetonu bellekte tutar', () => {
    setAccessToken('token-123');
    expect(getAccessToken()).toBe('token-123');
  });

  it('ApiError bir Error örneğidir', () => {
    const error = new ApiError(500, 'INTERNAL_ERROR', 'Sunucu hatası');
    expect(error).toBeInstanceOf(Error);
  });
});
