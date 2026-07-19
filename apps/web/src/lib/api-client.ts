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

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuthRetry?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
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
  const { body, skipAuthRetry, headers, ...rest } = options;

  const doFetch = async (): Promise<Response> =>
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      credentials: 'include',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(inMemoryAccessToken ? { Authorization: `Bearer ${inMemoryAccessToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

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
