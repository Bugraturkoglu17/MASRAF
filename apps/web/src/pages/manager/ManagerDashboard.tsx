import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/auth-context';
import { apiFetch } from '@/lib/api-client';

interface Counts {
  pending: number;
  approved: number;
  rejected: number;
}

const cards = [
  {
    key: 'pending',
    label: 'Onayda Bekleyen',
    icon: Clock,
    color: 'var(--color-pending)',
    bg: 'var(--color-pending-bg)',
    to: '/manager/pending',
  },
  {
    key: 'approved',
    label: 'Onaylanan',
    icon: CheckCircle,
    color: 'var(--color-approved)',
    bg: 'var(--color-approved-bg)',
    to: '/manager/approved',
  },
  {
    key: 'rejected',
    label: 'Reddedilen',
    icon: XCircle,
    color: 'var(--color-rejected)',
    bg: 'var(--color-rejected-bg)',
    to: '/manager/rejected',
  },
] as const;

export function ManagerDashboard(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: counts } = useQuery<Counts>({
    queryKey: ['manager-counts'],
    queryFn: () => apiFetch('/expenses/manager/counts'),
    refetchInterval: 10000,
  });

  return (
    <div style={{ padding: '28px 32px', maxWidth: 800 }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}
        >
          Yönetici Paneli
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
          Merhaba {user?.firstName}, bekleyen masrafları buradan yönetin.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {cards.map(({ key, label, icon: Icon, color, bg, to }) => (
          <button
            key={key}
            onClick={() => navigate(to)}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={22} color={color} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color }}>{counts ? counts[key] : '—'}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)' }}>
              {label}
            </div>
          </button>
        ))}
      </div>

      {counts && counts.pending > 0 && (
        <div
          style={{
            background: 'var(--color-pending-bg)',
            border: '1px solid var(--color-pending-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Clock size={20} color="var(--color-pending)" />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                {counts.pending} masraf onay bekliyor
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Bekleyen masrafları incelemeniz gerekiyor.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/manager/pending')}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--color-pending)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            İncele
          </button>
        </div>
      )}
    </div>
  );
}
