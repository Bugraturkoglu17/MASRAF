import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { type ManagerExpense } from '@/components/expenses/ExpenseCards';
import { DueDateBadge } from '@/components/ui/DueDateBadge';
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

  const { data: overdue } = useQuery<ManagerExpense[]>({
    queryKey: ['manager-overdue'],
    queryFn: () => apiFetch('/expenses/manager/overdue'),
    refetchInterval: 30000,
  });

  const { data: dueToday } = useQuery<ManagerExpense[]>({
    queryKey: ['manager-due-today'],
    queryFn: () => apiFetch('/expenses/manager/due-today'),
    refetchInterval: 30000,
  });

  const { data: dueSoon } = useQuery<ManagerExpense[]>({
    queryKey: ['manager-due-soon'],
    queryFn: () => apiFetch('/expenses/manager/due-soon'),
    refetchInterval: 30000,
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
            marginBottom: 20,
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

      {overdue && overdue.length > 0 && (
        <DueSection
          title="Gecikmiş Masraflar"
          icon={<AlertTriangle size={16} />}
          color="var(--color-rejected)"
          bg="var(--color-rejected-bg)"
          border="var(--color-rejected-border)"
          items={overdue}
          onNavigate={() => navigate('/manager/pending?sort=most-overdue')}
        />
      )}

      {dueToday && dueToday.length > 0 && (
        <DueSection
          title="Bugün Vadesi Dolan"
          icon={<Clock size={16} />}
          color="var(--color-warning, #e67e22)"
          bg="var(--color-warning-bg, rgba(230,126,34,0.08))"
          border="var(--color-warning-border, rgba(230,126,34,0.25))"
          items={dueToday}
          onNavigate={() => navigate('/manager/pending?sort=due-nearest')}
        />
      )}

      {dueSoon && dueSoon.length > 0 && (
        <DueSection
          title="Yakında Vadesi Dolacak (7 gün)"
          icon={<Clock size={16} />}
          color="var(--color-primary)"
          bg="rgba(100,80,200,0.06)"
          border="rgba(100,80,200,0.18)"
          items={dueSoon}
          onNavigate={() => navigate('/manager/pending?sort=due-nearest')}
        />
      )}
    </div>
  );
}

function DueSection({
  title,
  icon,
  color,
  bg,
  border,
  items,
  onNavigate,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  items: ManagerExpense[];
  onNavigate: () => void;
}) {
  const money = (amount: string | number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(amount));
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 'var(--radius-md)',
        padding: '14px 18px',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color }}>
          {icon}
          {title}
          <span
            style={{
              background: color,
              color: '#fff',
              borderRadius: 10,
              padding: '1px 7px',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {items.length}
          </span>
        </div>
        <button
          onClick={onNavigate}
          style={{
            fontSize: 12,
            color,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            padding: '2px 6px',
          }}
        >
          Tümünü gör →
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.slice(0, 5).map((exp) => (
          <div
            key={exp.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--color-surface)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
            }}
          >
            <span
              style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: 11 }}
            >
              #{exp.expenseCode}
            </span>
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {exp.user.firstName} {exp.user.lastName} — {exp.title}
            </span>
            <strong style={{ whiteSpace: 'nowrap', color }}>{money(exp.amount)}</strong>
            {exp.dueDate && <DueDateBadge dueDate={exp.dueDate} />}
          </div>
        ))}
      </div>
    </div>
  );
}
