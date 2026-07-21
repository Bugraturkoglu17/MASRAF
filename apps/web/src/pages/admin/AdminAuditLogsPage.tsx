import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { apiFetch, getApiErrorMessage } from '@/lib/api-client';

interface AuditActor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  createdAt: string;
  actor?: AuditActor | null;
}

interface AuditLogPage {
  items: AuditLog[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

const actionLabels: Record<string, string> = {
  CREATE: 'Oluşturma',
  UPDATE: 'Güncelleme',
  DELETE: 'Silme',
  APPROVE: 'Onay',
  REJECT: 'Ret',
  LOGIN: 'Giriş',
  LOGOUT: 'Çıkış',
  UPLOAD: 'Dosya yükleme',
};

export function AdminAuditLogsPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const query = useQuery<AuditLogPage>({
    queryKey: ['admin-audit-logs', page],
    queryFn: () => apiFetch(`/audit-logs?page=${page}&pageSize=25`),
  });

  return (
    <div className="page-container">
      <div className="page-heading-row">
        <div>
          <h1>Denetim Kayıtları</h1>
          <p>Kritik kullanıcı, masraf ve dosya işlemlerinin kalıcı işlem izi.</p>
        </div>
      </div>

      {query.isLoading && <div className="empty-state">Denetim kayıtları yükleniyor…</div>}
      {query.isError && (
        <div className="error-state" role="alert">
          {getApiErrorMessage(
            query.error,
            'Denetim kayıtları alınamadı. Bağlantıyı kontrol edip tekrar deneyin.',
          )}
          <button type="button" onClick={() => void query.refetch()}>
            Tekrar Dene
          </button>
        </div>
      )}
      {query.data && query.data.items.length === 0 && (
        <div className="empty-state">Henüz denetim kaydı bulunmuyor.</div>
      )}
      {query.data && query.data.items.length > 0 && (
        <>
          <div className="table-scroll-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>İşlem</th>
                  <th>Kaynak</th>
                  <th>Aktör</th>
                  <th>Kayıt Kimliği</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString('tr-TR')}</td>
                    <td>{actionLabels[log.action] ?? log.action}</td>
                    <td>{log.resource}</td>
                    <td>
                      {log.actor
                        ? `${log.actor.firstName} ${log.actor.lastName} (${log.actor.email})`
                        : 'Sistem'}
                    </td>
                    <td className="monospace-cell">{log.resourceId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-row">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Önceki
            </button>
            <span>
              Sayfa {query.data.meta.page} / {query.data.meta.totalPages} ·{' '}
              {query.data.meta.totalItems} kayıt
            </span>
            <button
              type="button"
              disabled={page >= query.data.meta.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Sonraki
            </button>
          </div>
        </>
      )}
    </div>
  );
}
