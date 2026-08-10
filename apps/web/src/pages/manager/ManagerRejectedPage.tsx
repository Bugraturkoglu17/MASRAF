import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { XCircle } from 'lucide-react';
import { useState } from 'react';

import { ManagerExpenseCard, type ManagerExpense } from '@/components/expenses/ExpenseCards';
import { useToast } from '@/components/feedback/toast-context';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ExpenseDetailSheet } from '@/components/ui/ExpenseDetailSheet';
import { apiFetch, getApiErrorMessage } from '@/lib/api-client';

interface PagedResult {
  items: ManagerExpense[];
  meta: { totalItems: number };
}

export function ManagerRejectedPage(): JSX.Element {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagerExpense | null>(null);

  const { data, isLoading } = useQuery<PagedResult>({
    queryKey: ['manager-rejected'],
    queryFn: () => apiFetch('/expenses/manager/rejected?limit=50'),
    refetchInterval: 30000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/expenses/manager/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['manager-rejected'] });
      void qc.invalidateQueries({ queryKey: ['manager-counts'] });
      showToast('Masraf silindi.', 'success');
      setDeleteTarget(null);
    },
    onError: (err) => {
      showToast(getApiErrorMessage(err, 'Masraf silinemedi.'), 'error');
      setDeleteTarget(null);
    },
  });

  return (
    <div className="manager-expenses-page">
      <header className="manager-page-hero">
        <span>
          <XCircle />
        </span>
        <div>
          <h1>Reddedilen Masraflar</h1>
          <p>{data?.meta.totalItems ?? 0} masraf reddedildi</p>
        </div>
      </header>
      <main className="manager-expense-list">
        {isLoading ? (
          <div className="expense-list-loading">Masraflar yükleniyor…</div>
        ) : !data?.items.length ? (
          <div className="expense-empty-state">
            <span>
              <XCircle />
            </span>
            <strong>Reddedilen masraf bulunmuyor.</strong>
            <p>Reddettiğiniz masraflar burada görünür.</p>
          </div>
        ) : (
          data.items.map((expense) => (
            <ManagerExpenseCard
              key={expense.id}
              expense={expense}
              selected={detailId === expense.id}
              onSelect={() => setDetailId((prev) => (prev === expense.id ? null : expense.id))}
              onDelete={() => setDeleteTarget(expense)}
              busy={deleteMut.isPending}
            />
          ))
        )}
      </main>

      {detailId && <ExpenseDetailSheet expenseId={detailId} onClose={() => setDetailId(null)} />}

      {deleteTarget && (
        <ConfirmDialog
          title="Masrafı Sil"
          description="Bu masrafı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
          confirmLabel={deleteMut.isPending ? 'Siliniyor...' : 'Evet, Sil'}
          cancelLabel="Vazgeç"
          busy={deleteMut.isPending}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
