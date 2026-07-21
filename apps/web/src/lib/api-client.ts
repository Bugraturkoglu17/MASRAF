import type { ApiErrorBody } from '@masraf/shared-types';

const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Karar: erişim jetonu yalnızca bu modülün kapsadığı bellek değişkeninde
 * tutulur; localStorage/sessionStorage'a yazılmaz. XSS ile çalışan zararlı
 * bir script sayfa yenilenene kadar jetonu okuyabilir ama kalıcı depoya
 * erişemez. Sayfa yenilendiğinde refresh cookie'si (httpOnly) ile yeni bir
 * access token alınır. Detay: docs/security.md.
 */
let inMemoryAccessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown[],
    public readonly requestId?: string,
  ) {
    super(message);
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  return error.requestId ? `${error.message} (Talep: ${error.requestId})` : error.message;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuthRetry?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;
const REQUEST_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url: string, init: RequestInit, externalSignal?: AbortSignal) {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) abortFromCaller();
  else externalSignal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = window.setTimeout(() => controller.abort('timeout'), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      const cancelled = externalSignal?.aborted;
      throw new ApiError(
        0,
        cancelled ? 'REQUEST_CANCELLED' : 'NETWORK_TIMEOUT',
        cancelled
          ? 'İstek iptal edildi.'
          : 'Sunucu zamanında yanıt vermedi. Lütfen tekrar deneyin.',
      );
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Sunucuyla bağlantı kurulamadı.');
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', abortFromCaller);
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = (await res.json()) as { accessToken: string };
        setAccessToken(data.accessToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuthRetry, headers, signal, ...rest } = options;
  const method = (rest.method ?? 'GET').toUpperCase();
  const alwaysOnlinePath = /\/(attachments|reports)(\/|$)/.test(path);
  if ((!['GET', 'HEAD'].includes(method) || alwaysOnlinePath) && !navigator.onLine) {
    throw new ApiError(0, 'NETWORK_REQUIRED', 'Bu işlem için internet bağlantısı gereklidir.');
  }

  const doFetch = async (): Promise<Response> =>
    fetchWithTimeout(
      `${API_BASE_URL}${path}`,
      {
        ...rest,
        credentials: 'include',
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(inMemoryAccessToken ? { Authorization: `Bearer ${inMemoryAccessToken}` } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      signal ?? undefined,
    );

  let response = await doFetch();

  if (response.status === 401 && !skipAuthRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await doFetch();
    }
  }

  if (!response.ok) {
    let errorBody: ApiErrorBody | undefined;
    try {
      errorBody = (await response.json()) as ApiErrorBody;
    } catch {
      // JSON gövdesi yoksa aşağıdaki genel hata kullanılır.
    }
    throw new ApiError(
      response.status,
      errorBody?.code ?? 'UNKNOWN_ERROR',
      errorBody?.message ?? 'Sunucuyla iletişim kurulamadı.',
      errorBody?.details,
      errorBody?.requestId,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
