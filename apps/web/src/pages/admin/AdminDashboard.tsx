import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, Users, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/auth-context';
import { apiFetch } from '@/lib/api-client';

interface Counts {
  pending: number;
  approved: number;
  rejected: number;
}
interface User {
  id: string;
  role: string;
  status: string;
}

const cards = [
  {
    key: 'pending',
    label: 'Onay Bekleyen',
    icon: Clock,
    color: 'var(--color-pending)',
    bg: 'var(--color-pending-bg)',
  },
  {
    key: 'approved',
    label: 'Onaylanan',
    icon: CheckCircle,
    color: 'var(--color-approved)',
    bg: 'var(--color-approved-bg)',
  },
  {
    key: 'rejected',
    label: 'Reddedilen',
    icon: XCircle,
    color: 'var(--color-rejected)',
    bg: 'var(--color-rejected-bg)',
  },
] as const;

export function AdminDashboard(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: counts } = useQuery<Counts>({
    queryKey: ['manager-counts'],
    queryFn: () => apiFetch('/expenses/manager/counts'),
    refetchInterval: 15000,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: () => apiFetch('/users'),
    refetchInterval: 30000,
  });

  const activeUsers = users.filter((u) => u.status === 'ACTIVE').length;
  const managers = users.filter((u) => u.role === 'MANAGER').length;
  const admins = users.filter((u) => u.role === 'ADMIN').length;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}
        >
          Admin Paneli
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
          Merhaba {user?.firstName}, sistem geneli özeti aşağıda.
        </p>
      </div>

      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--color-text-muted)',
          letterSpacing: '0.07em',
          marginBottom: 12,
        }}
      >
        MASRAF DURUMU
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          marginBottom: 28,
        }}
      >
        {cards.map(({ key, label, icon: Icon, color, bg }) => (
          <div
            key={key}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={20} color={color} />
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color }}>{counts ? counts[key] : '—'}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--color-text-muted)',
          letterSpacing: '0.07em',
          marginBottom: 12,
        }}
      >
        KULLANICI DURUMU
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          marginBottom: 28,
        }}
      >
        {[
          { label: 'Aktif Kullanıcı', value: activeUsers, color: 'var(--color-approved)' },
          { label: 'Yönetici', value: managers, color: 'var(--color-pending)' },
          { label: 'Admin', value: admins, color: 'var(--color-draft)' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: 'var(--color-draft-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={17} color="var(--color-draft)" />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 14 }}>
              Toplam {users.length} kullanıcı kayıtlı
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Rol ve durum yönetimi için Kullanıcılar sayfasına gidin.
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/users')}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            background: 'var(--color-primary)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Kullanıcılar
        </button>
      </div>
    </div>
  );
}
