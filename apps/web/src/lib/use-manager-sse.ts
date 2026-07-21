import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { apiFetch, getAccessToken } from './api-client';

const API_BASE_URL = import.meta.env.VITE_API_URL as string;
const MAX_RECONNECT_ATTEMPTS = 5;
const POLLING_INTERVAL_MS = 30_000;

export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'polling';

export function getReconnectDelay(attempt: number): number | null {
  if (attempt >= MAX_RECONNECT_ATTEMPTS) return null;
  return Math.min(1000 * 2 ** Math.max(0, attempt - 1), 15_000);
}

export function useManagerSse(): RealtimeConnectionStatus {
  const qc = useQueryClient();
  const [status, setStatus] = useState<RealtimeConnectionStatus>('connecting');

  useEffect(() => {
    let stopped = false;
    let reconnectAttempt = 0;
    let controller: AbortController | undefined;
    let reconnectTimer: number | undefined;
    let pollingTimer: number | undefined;

    const invalidateManagerData = () => {
      void qc.invalidateQueries({ queryKey: ['manager-pending'] });
      void qc.invalidateQueries({ queryKey: ['manager-approved'] });
      void qc.invalidateQueries({ queryKey: ['manager-rejected'] });
      void qc.invalidateQueries({ queryKey: ['manager-counts'] });
    };

    const stopPolling = () => {
      if (pollingTimer !== undefined) window.clearInterval(pollingTimer);
      pollingTimer = undefined;
    };

    const startPolling = () => {
      if (stopped || pollingTimer !== undefined) return;
      setStatus('polling');
      invalidateManagerData();
      pollingTimer = window.setInterval(invalidateManagerData, POLLING_INTERVAL_MS);
    };

    const scheduleReconnect = (connect: () => Promise<void>) => {
      reconnectAttempt += 1;
      const delayMs = getReconnectDelay(reconnectAttempt);
      if (delayMs === null) {
        startPolling();
        return;
      }
      setStatus('connecting');
      reconnectTimer = window.setTimeout(() => void connect(), delayMs);
    };

    const connect = async (): Promise<void> => {
      if (stopped || !navigator.onLine) {
        startPolling();
        return;
      }
      controller = new AbortController();
      try {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/events/manager`, {
          credentials: 'include',
          headers: {
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });
        if (response.status === 401) {
          await apiFetch('/users/me');
          scheduleReconnect(connect);
          return;
        }
        if (!response.ok || !response.body) throw new Error('SSE bağlantısı kurulamadı.');

        reconnectAttempt = 0;
        stopPolling();
        setStatus('connected');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split(/\r?\n\r?\n/);
          buffer = frames.pop() ?? '';
          for (const frame of frames) {
            const data = frame
              .split(/\r?\n/)
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim())
              .join('\n');
            if (!data) continue;
            const event = JSON.parse(data) as { type?: string };
            if (event.type?.startsWith('EXPENSE_')) invalidateManagerData();
          }
        }
        if (!stopped) scheduleReconnect(connect);
      } catch (error) {
        if (stopped || (error instanceof DOMException && error.name === 'AbortError')) return;
        invalidateManagerData();
        scheduleReconnect(connect);
      }
    };

    const retryRealtime = () => {
      if (stopped || !navigator.onLine) return;
      controller?.abort();
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      reconnectAttempt = 0;
      stopPolling();
      setStatus('connecting');
      void connect();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') retryRealtime();
    };

    void connect();
    window.addEventListener('online', retryRealtime);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopped = true;
      controller?.abort();
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      stopPolling();
      window.removeEventListener('online', retryRealtime);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [qc]);

  return status;
}
