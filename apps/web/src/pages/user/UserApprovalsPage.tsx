import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  UserApprovalTabs,
  UserApprovedExpenseList,
  UserPendingExpenseList,
  UserRejectedExpenseList,
  type ExpenseListItem,
} from '@/components/expenses/ExpenseCards';
import { ExpenseDetailSheet } from '@/components/ui/ExpenseDetailSheet';
import { apiFetch } from '@/lib/api-client';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
interface PagedResult {
  items: ExpenseListItem[];
  meta: { totalItems: number };
}
interface Counts {
  pending: number;
  approved: number;
  rejected: number;
}

export function UserApprovalsPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const requested = params.get('status');
  const active: ApprovalStatus =
    requested === 'APPROVED' || requested === 'REJECTED' ? requested : 'PENDING';
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data, isLoading } = useQuery<PagedResult>({
    queryKey: ['expenses', active],
    queryFn: () => apiFetch(`/expenses?status=${active}&limit=50`),
    refetchInterval: 15000,
  });
  const { data: counts } = useQuery<Counts>({
    queryKey: ['expense-counts'],
    queryFn: () => apiFetch('/expenses/counts'),
  });
  const listProps = { items: data?.items ?? [], onDetail: setDetailId };
  return (
    <div className="mobile-approval-page">
      <header className="approval-hero">
        <div>
          <CheckCircle2 />
          <h1>Onaylar</h1>
        </div>
        <button type="button" aria-label="Onayları filtrele">
          <SlidersHorizontal />
        </button>
      </header>
      <UserApprovalTabs
        active={active}
        counts={
          counts
            ? { PENDING: counts.pending, APPROVED: counts.approved, REJECTED: counts.rejected }
            : undefined
        }
        onChange={(status) => setParams({ status })}
      />
      <main className="approval-content">
        {isLoading ? (
          <div className="expense-list-loading">Masraflar yükleniyor…</div>
        ) : active === 'PENDING' ? (
          <UserPendingExpenseList {...listProps} />
        ) : active === 'APPROVED' ? (
          <UserApprovedExpenseList {...listProps} />
        ) : (
          <UserRejectedExpenseList {...listProps} />
        )}
      </main>
      {detailId && <ExpenseDetailSheet expenseId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
