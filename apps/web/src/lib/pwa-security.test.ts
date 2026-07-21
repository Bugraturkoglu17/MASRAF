import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiFetch, getAccessToken, setAccessToken } from './api-client';

describe('PWA çevrimdışı güvenliği', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  });

  afterEach(() => {
    setAccessToken(null);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.unstubAllGlobals();
  });

  it('çevrimdışıyken mutasyon isteğini ağa göndermeden engeller', async () => {
    await expect(
      apiFetch('/expenses', { method: 'POST', body: { title: 'Test' } }),
    ).rejects.toMatchObject({
      code: 'NETWORK_REQUIRED',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('signed URL uçlarını çevrimdışıyken engeller', async () => {
    await expect(apiFetch('/attachments/file-id/download-url')).rejects.toMatchObject({
      code: 'NETWORK_REQUIRED',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('access tokenı Web Storage yerine yalnızca bellekte tutar', () => {
    setAccessToken('temporary-token');
    expect(getAccessToken()).toBe('temporary-token');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(sessionStorage.getItem('accessToken')).toBeNull();
  });
});
