import { useCallback, useEffect, useMemo, useState } from 'react';

export interface LocalExpenseDraft {
  categoryId?: string;
  title?: string;
  description?: string;
  amount?: number;
  expenseDate?: string;
  dueDate?: string;
  updatedAt: string;
}

interface DraftRecord {
  key: string;
  userId: string;
  organizationId: string;
  data: LocalExpenseDraft;
}

const DB_NAME = 'masraf-pwa';
const STORE_NAME = 'expense-drafts';
const MAX_DRAFT_BYTES = 64 * 1024;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

export function useLocalExpenseDraft(userId?: string, organizationId?: string) {
  const [draft, setDraft] = useState<LocalExpenseDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const key = useMemo(
    () => (userId && organizationId ? `${organizationId}:${userId}:new-expense` : null),
    [organizationId, userId],
  );

  const refresh = useCallback(async () => {
    if (!key || !('indexedDB' in window)) {
      setDraft(null);
      setIsLoading(false);
      return null;
    }
    try {
      const record = await transact<DraftRecord | undefined>('readonly', (store) => store.get(key));
      const next = record?.data ?? null;
      setDraft(next);
      return next;
    } catch {
      setDraft(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  const saveDraft = useCallback(
    async (data: Omit<LocalExpenseDraft, 'updatedAt'>) => {
      if (!key || !userId || !organizationId || !('indexedDB' in window)) return;
      const next: LocalExpenseDraft = { ...data, updatedAt: new Date().toISOString() };
      if (new Blob([JSON.stringify(next)]).size > MAX_DRAFT_BYTES) {
        throw new Error('Yerel taslak 64 KB sınırını aşıyor.');
      }
      await transact<IDBValidKey>('readwrite', (store) =>
        store.put({ key, userId, organizationId, data: next } satisfies DraftRecord),
      );
      setDraft(next);
    },
    [key, organizationId, userId],
  );

  const clearDraft = useCallback(async () => {
    if (key && 'indexedDB' in window) {
      await transact<undefined>('readwrite', (store) => store.delete(key));
    }
    setDraft(null);
  }, [key]);

  return { draft, isLoading, saveDraft, clearDraft, refresh };
}
