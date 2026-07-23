import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';

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
  const qc = useQueryClient();
  const { showToast } = useToast();

  const { data: items = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: () => apiFetch('/notifications'),
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (error) => showToast(getApiErrorMessage(error, 'Bildirim güncellenemedi.'), 'error'),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = items.filter((n) => !n.readAt);
      await Promise.all(
        unread.map((n) => apiFetch(`/notifications/${n.id}/read`, { method: 'PATCH' })),
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      showToast('Tüm bildirimler okundu olarak işaretlendi.', 'success');
    },
    onError: (error) => showToast(getApiErrorMessage(error, 'İşlem tamamlanamadı.'), 'error'),
  });

  const unread = items.filter((n) => !n.readAt);
  const read = items.filter((n) => n.readAt);

  return (
    <section style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 96px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, margin: '0 0 2px' }}>Bildirimler</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 13 }}>
            {unread.length > 0 ? `${unread.length} okunmamış bildirim` : 'Tüm bildirimler okundu'}
          </p>
        </div>
        {unread.length > 0 && (
          <button
            type="button"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-muted)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <CheckCheck size={15} />
            Tümünü okundu işaretle
          </button>
        )}
      </div>

      {isLoading && (
        <p role="status" style={{ color: 'var(--color-text-muted)' }}>
          Yükleniyor…
        </p>
      )}

      {!isLoading && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
          <Bell size={32} aria-hidden="true" style={{ opacity: 0.4 }} />
          <p style={{ marginTop: 12 }}>Henüz bildiriminiz yok.</p>
        </div>
      )}

      {unread.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: '0 0 10px',
            }}
          >
            Okunmamış
          </h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {unread.map((item) => (
              <NotificationCard
                key={item.id}
                item={item}
                onMarkRead={() => markRead.mutate(item.id)}
                busy={markRead.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {read.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: '0 0 10px',
            }}
          >
            Okunmuş
          </h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {read.map((item) => (
              <NotificationCard key={item.id} item={item} busy={false} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function NotificationCard({
  item,
  onMarkRead,
  busy,
}: {
  item: NotificationItem;
  onMarkRead?: () => void;
  busy: boolean;
}) {
  const isUnread = !item.readAt;
  return (
    <article
      style={{
        padding: '14px 16px',
        borderRadius: 12,
        border: `1px solid ${isUnread ? 'var(--color-pending-border)' : 'var(--color-border)'}`,
        background: isUnread ? 'var(--color-pending-bg)' : 'var(--color-surface)',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: isUnread ? 'var(--color-pending)' : 'var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <Bell size={16} color="#fff" aria-hidden="true" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 3 }}>
          {item.title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--color-text-muted)',
            lineHeight: 1.5,
            marginBottom: 6,
          }}
        >
          {item.body}
        </div>
        <time style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          {new Date(item.createdAt).toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      </div>
      {isUnread && onMarkRead && (
        <button
          type="button"
          aria-label="Okundu olarak işaretle"
          disabled={busy}
          onClick={onMarkRead}
          style={{
            padding: '6px 10px',
            borderRadius: 7,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-muted)',
            fontSize: 11,
            fontWeight: 600,
            cursor: busy ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Okundu
        </button>
      )}
    </article>
  );
}
