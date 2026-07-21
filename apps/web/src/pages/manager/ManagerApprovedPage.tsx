import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

import { ManagerExpenseCard, type ManagerExpense } from '@/components/expenses/ExpenseCards';
import { ExpenseDetailSheet } from '@/components/ui/ExpenseDetailSheet';
import { apiFetch } from '@/lib/api-client';

interface PagedResult {
  items: ManagerExpense[];
  meta: { totalItems: number };
}

export function ManagerApprovedPage(): JSX.Element {
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data, isLoading } = useQuery<PagedResult>({
    queryKey: ['manager-approved'],
    queryFn: () => apiFetch('/expenses/manager/approved?limit=50'),
    refetchInterval: 30000,
  });

  return (
    <div className="manager-expenses-page">
      <header className="manager-page-hero">
        <span>
          <CheckCircle2 />
        </span>
        <div>
          <h1>Onaylanan Masraflar</h1>
          <p>{data?.meta.totalItems ?? 0} masraf onaylandı</p>
        </div>
      </header>
      <main className="manager-expense-list">
        {isLoading ? (
          <div className="expense-list-loading">Masraflar yükleniyor…</div>
        ) : !data?.items.length ? (
          <div className="expense-empty-state">
            <span>
              <CheckCircle2 />
            </span>
            <strong>Onaylanan masraf bulunmuyor.</strong>
            <p>Onayladığınız masraflar burada görünür.</p>
          </div>
        ) : (
          data.items.map((expense) => (
            <ManagerExpenseCard
              key={expense.id}
              expense={expense}
              selected={detailId === expense.id}
              onSelect={() => setDetailId((prev) => (prev === expense.id ? null : expense.id))}
            />
          ))
        )}
      </main>
      {detailId && <ExpenseDetailSheet expenseId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
