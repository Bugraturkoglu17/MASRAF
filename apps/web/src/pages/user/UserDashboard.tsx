import { useQuery } from '@tanstack/react-query';
import { BarChart2, Bell, MessageSquare, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  ExpenseEmptyState,
  MobileReceiptExpenseCard,
  type ExpenseListItem,
  type ExpenseStatus,
} from '@/components/expenses/ExpenseCards';
import { ExpenseDetailSheet } from '@/components/ui/ExpenseDetailSheet';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch } from '@/lib/api-client';

const STATUS_TABS: { status: ExpenseStatus; label: string; countKey: string }[] = [
  { status: 'PENDING', label: 'Bekleyen', countKey: 'pending' },
  { status: 'APPROVED', label: 'Onaylanan', countKey: 'approved' },
  { status: 'REJECTED', label: 'Reddedilen', countKey: 'rejected' },
  { status: 'DRAFT', label: 'Taslaklar', countKey: 'draft' },
];

interface Counts {
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface PagedResult {
  items: ExpenseListItem[];
  meta: { totalItems: number };
}

export function UserDashboard(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const activeStatus = (params.get('tab') as ExpenseStatus) ?? 'PENDING';
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: counts } = useQuery<Counts>({
    queryKey: ['expense-counts'],
    queryFn: () => apiFetch('/expenses/counts'),
    refetchInterval: 10000,
  });

  const { data, isLoading, isFetching, refetch } = useQuery<PagedResult>({
    queryKey: ['expenses-home', activeStatus],
    queryFn: () => apiFetch(`/expenses?status=${activeStatus}&limit=30`),
    refetchInterval: 15000,
  });

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="user-home-page">
      <header className="user-home-hero">
        <button
          type="button"
          className="user-home-avatar"
          aria-label="Profilim"
          onClick={() => navigate('/profile')}
        >
          {initials}
        </button>
        <div className="user-home-greeting">
          <strong>
            Merhaba, <span>{user?.firstName}</span>
          </strong>
          <em>Masraff girmeye hazır mısın?</em>
        </div>
        <div className="user-home-hero-icons">
          <button type="button" aria-label="Mesajlar">
            <MessageSquare />
          </button>
          <button type="button" aria-label="İstatistikler">
            <BarChart2 />
          </button>
          <button type="button" aria-label="Bildirimler" onClick={() => navigate('/notifications')}>
            <Bell />
          </button>
        </div>
      </header>

      <div className="user-home-tabs-wrap">
        <div className="user-home-tabs" role="tablist">
          {STATUS_TABS.map(({ status, label, countKey }) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={activeStatus === status}
              className={activeStatus === status ? 'active' : ''}
              onClick={() => setParams({ tab: status })}
            >
              {label}
              {counts != null && <small>{counts[countKey as keyof Counts]}</small>}
            </button>
          ))}
        </div>
        <div className="user-home-tab-toolbar">
          <button
            type="button"
            aria-label="Yenile"
            disabled={isFetching}
            onClick={() => void refetch()}
            style={{ opacity: isFetching ? 0.6 : 1 }}
          >
            <RefreshCw
              size={16}
              style={isFetching ? { animation: 'spin 0.8s linear infinite' } : undefined}
            />
          </button>
        </div>
      </div>

      <main className="user-home-list">
        {isLoading ? (
          <div className="expense-list-loading">Masraflar yükleniyor…</div>
        ) : !data?.items.length ? (
          <ExpenseEmptyState status={activeStatus} />
        ) : (
          <div className="receipt-list">
            {data.items.map((exp) => (
              <MobileReceiptExpenseCard
                key={exp.id}
                expense={exp}
                onDetail={() => setDetailId(exp.id)}
              />
            ))}
          </div>
        )}
      </main>

      {detailId && <ExpenseDetailSheet expenseId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
