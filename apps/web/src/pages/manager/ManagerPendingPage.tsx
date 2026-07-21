import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3 } from 'lucide-react';
import { useState } from 'react';

import { ManagerExpenseCard, type ManagerExpense } from '@/components/expenses/ExpenseCards';
import { useToast } from '@/components/feedback/toast-context';
import { ExpenseDetailSheet } from '@/components/ui/ExpenseDetailSheet';
import { apiFetch, getApiErrorMessage } from '@/lib/api-client';

interface PagedResult {
  items: ManagerExpense[];
  meta: { totalItems: number; page: number; totalPages: number };
}
type Decision = { kind: 'approve' | 'reject' | 'cancel'; expense: ManagerExpense };

type SortOption = 'due-nearest' | 'due-farthest' | 'most-overdue' | 'newest' | 'oldest';
const SORT_LABELS: Record<SortOption, string> = {
  'due-nearest': 'Vadeye en yakın',
  'due-farthest': 'Vadeye en uzak',
  'most-overdue': 'En çok gecikmiş',
  newest: 'En yeni',
  oldest: 'En eski',
};

export function ManagerPendingPage(): JSX.Element {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState('');
  const [sort, setSort] = useState<SortOption>('due-nearest');
  const { data, isLoading } = useQuery<PagedResult>({
    queryKey: ['manager-pending', sort],
    queryFn: () => apiFetch(`/expenses/manager/pending?limit=50&sort=${sort}`),
    refetchInterval: 10000,
  });

  const finish = (expenseId: string, message: string) => {
    qc.setQueryData<PagedResult>(['manager-pending'], (old) =>
      old
        ? {
            ...old,
            items: old.items.filter((item) => item.id !== expenseId),
            meta: { ...old.meta, totalItems: Math.max(0, old.meta.totalItems - 1) },
          }
        : old,
    );
    void qc.invalidateQueries({ queryKey: ['manager-counts'] });
    void qc.invalidateQueries({ queryKey: ['expenses'] });
    setDecision(null);
    setReason('');
    setDetailId(null);
    showToast(message, 'success');
  };
  const decide = useMutation({
    mutationFn: async (value: Decision) => {
      if (value.kind === 'approve')
        return apiFetch(`/expenses/${value.expense.id}/approve`, { method: 'POST' });
      return apiFetch(`/expenses/${value.expense.id}/${value.kind}`, {
        method: 'POST',
        body: { reason },
      });
    },
    onSuccess: (_, value) =>
      finish(
        value.expense.id,
        value.kind === 'approve'
          ? 'Masraf onaylandı.'
          : value.kind === 'reject'
            ? 'Masraf reddedildi.'
            : 'Masraf iptal edildi.',
      ),
    onError: (error) => showToast(getApiErrorMessage(error, 'İşlem tamamlanamadı.'), 'error'),
  });

  return (
    <div className="manager-expenses-page">
      <header className="manager-page-hero">
        <span>
          <Clock3 />
        </span>
        <div>
          <h1>Onayda Bekleyenler</h1>
          <p>{data?.meta.totalItems ?? 0} masraf kararınızı bekliyor</p>
        </div>
        <select
          className="manager-sort-select"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          aria-label="Sıralama"
        >
          {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </header>
      <main className="manager-expense-list">
        {isLoading ? (
          <div className="expense-list-loading">Masraflar yükleniyor…</div>
        ) : !data?.items.length ? (
          <div className="expense-empty-state">
            <span>
              <Clock3 />
            </span>
            <strong>Bekleyen masraf bulunmuyor.</strong>
            <p>Yeni gönderimler anlık olarak burada görünecek.</p>
          </div>
        ) : (
          data.items.map((expense) => (
            <ManagerExpenseCard
              key={expense.id}
              expense={expense}
              selected={detailId === expense.id}
              onSelect={() => setDetailId(expense.id)}
              onApprove={() => setDecision({ kind: 'approve', expense })}
              onReject={() => setDecision({ kind: 'reject', expense })}
              onCancel={() => setDecision({ kind: 'cancel', expense })}
              busy={decide.isPending}
            />
          ))
        )}
      </main>
      {detailId && <ExpenseDetailSheet expenseId={detailId} onClose={() => setDetailId(null)} />}
      {decision && (
        <DecisionModal
          decision={decision}
          reason={reason}
          onReason={setReason}
          busy={decide.isPending}
          onClose={() => {
            setDecision(null);
            setReason('');
          }}
          onConfirm={() => decide.mutate(decision)}
        />
      )}
    </div>
  );
}

function DecisionModal({
  decision,
  reason,
  onReason,
  onClose,
  onConfirm,
  busy,
}: {
  decision: Decision;
  reason: string;
  onReason: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const requiresReason = decision.kind !== 'approve';
  const verb =
    decision.kind === 'approve' ? 'Onayla' : decision.kind === 'reject' ? 'Reddet' : 'İptal et';
  return (
    <div className="decision-backdrop" onMouseDown={onClose}>
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="decision-title"
        className="decision-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className={`decision-symbol ${decision.kind}`} />
        <h2 id="decision-title">Masrafı {verb.toLocaleLowerCase('tr-TR')}</h2>
        <p>
          <strong>
            {decision.expense.user.firstName} {decision.expense.user.lastName}
          </strong>{' '}
          tarafından gönderilen “{decision.expense.title}” masrafı için bu işlem uygulanacak.
        </p>
        {requiresReason && (
          <label>
            Gerekçe <span>*</span>
            <textarea
              autoFocus
              value={reason}
              onChange={(e) => onReason(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Karar gerekçesini açıklayın…"
            />
          </label>
        )}
        <div>
          <button type="button" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className={decision.kind}
            disabled={busy || (requiresReason && !reason.trim())}
            onClick={onConfirm}
          >
            {busy ? 'İşleniyor…' : verb}
          </button>
        </div>
      </section>
    </div>
  );
}
