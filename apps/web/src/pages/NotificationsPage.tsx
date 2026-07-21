import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';

import { useToast } from '@/components/feedback/toast-context';
import { apiFetch, getApiErrorMessage } from '@/lib/api-client';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  channel: 'IN_APP' | 'EMAIL';
  readAt: string | null;
  createdAt: string;
}

export function NotificationsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const notifications = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: () => apiFetch('/notifications'),
    refetchInterval: 30_000,
  });
  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (error) => showToast(getApiErrorMessage(error, 'Bildirim güncellenemedi.'), 'error'),
  });

  return (
    <section style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 96px' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Bildirimler</h1>
      <p style={{ color: 'var(--color-text-muted)', margin: '0 0 18px' }}>
        Masraf durum değişiklikleri ve önemli hatırlatmalar.
      </p>

      {notifications.isLoading && <p role="status">Bildirimler yükleniyor…</p>}
      {notifications.isError && (
        <div role="alert" style={{ color: 'var(--color-danger)', marginBottom: 16 }}>
          Bildirimler alınamadı. Lütfen yeniden deneyin.
        </div>
      )}
      {notifications.data?.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
          <Bell size={28} aria-hidden="true" />
          <p>Henüz bildiriminiz yok.</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {notifications.data?.map((item) => (
          <article
            key={item.id}
            style={{
              padding: 14,
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              background: item.readAt ? 'var(--color-surface)' : 'var(--color-draft-bg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Bell size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: 15, margin: 0 }}>{item.title}</h2>
                <p style={{ fontSize: 14, margin: '5px 0', overflowWrap: 'anywhere' }}>
                  {item.body}
                </p>
                <time style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {new Date(item.createdAt).toLocaleString('tr-TR')}
                </time>
              </div>
              {!item.readAt && (
                <button
                  type="button"
                  aria-label={`${item.title} bildirimini okundu işaretle`}
                  disabled={markRead.isPending}
                  onClick={() => markRead.mutate(item.id)}
                  style={{
                    width: 44,
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-primary)',
                  }}
                >
                  <Check size={17} aria-hidden="true" />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
