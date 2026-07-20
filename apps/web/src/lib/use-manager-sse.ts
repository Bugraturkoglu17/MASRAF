import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { getAccessToken } from './api-client';

const API_BASE_URL = import.meta.env.VITE_API_URL as string;

export function useManagerSse(): void {
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const url = `${API_BASE_URL}/events/manager${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    const connect = () => {
      const es = new EventSource(url, { withCredentials: true });
      esRef.current = es;

      es.onmessage = (e: MessageEvent<string>) => {
        try {
          const data = JSON.parse(e.data) as { type: string };
          if (
            data.type === 'EXPENSE_SUBMITTED' ||
            data.type === 'EXPENSE_APPROVED' ||
            data.type === 'EXPENSE_REJECTED'
          ) {
            qc.invalidateQueries({ queryKey: ['manager-pending'] });
            qc.invalidateQueries({ queryKey: ['manager-approved'] });
            qc.invalidateQueries({ queryKey: ['manager-rejected'] });
            qc.invalidateQueries({ queryKey: ['manager-counts'] });
          }
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [qc]);
}
