import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useToast } from '@/components/feedback/toast-context';
import { ExpenseCard } from '@/components/ui/ExpenseCard';
import { ExpenseDetailSheet } from '@/components/ui/ExpenseDetailSheet';
import { ExpenseSubmitDialog } from '@/components/ui/ExpenseSubmitDialog';
import { apiFetch } from '@/lib/api-client';

type Status = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface Expense {
  id: string;
  expenseNumber?: string | null;
  title: string;
  amount: string;
  currency: string;
  expenseDate: string;
  dueDate?: string | null;
  status: Status;
  category: { name: string };
}

interface PagedResult {
  items: Expense[];
  meta: { totalItems: number; page: number; totalPages: number };
}

const tabs: { status: Status; label: string }[] = [
  { status: 'DRAFT', label: 'Taslaklar' },
  { status: 'PENDING', label: 'Bekleyen' },
  { status: 'APPROVED', label: 'Onaylı' },
  { status: 'REJECTED', label: 'Reddedilen' },
];

export function UserExpensesPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const activeStatus = (params.get('status') as Status) ?? 'DRAFT';
  const navigate = useNavigate();
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [submitTarget, setSubmitTarget] = useState<Expense | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<PagedResult>({
    queryKey: ['expenses', activeStatus],
    queryFn: () => apiFetch(`/expenses?status=${activeStatus}&limit=50`),
    refetchInterval: 15000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-counts'] });
      showToast('Masraf silindi.', 'success');
    },
    onError: () => showToast('Silinemedi.', 'error'),
  });

  const submitMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/expenses/${id}/submit`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-counts'] });
      showToast('Masraf onaya gönderildi.', 'success');
      setSubmitTarget(null);
    },
    onError: (e: Error) => {
      throw e;
    },
  });

  const handleConfirmSubmit = async () => {
    if (!submitTarget) return;
    await submitMut.mutateAsync(submitTarget.id);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu masrafı silmek istediğinize emin misiniz?')) {
      deleteMut.mutate(id);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 0' }}>
        <h1
          style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 16px' }}
        >
          Masraflarım
        </h1>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            overflowX: 'auto',
            borderBottom: '2px solid var(--color-border)',
            marginBottom: 16,
            WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          }}
        >
          {tabs.map(({ status, label }) => (
            <button
              key={status}
              onClick={() => setParams({ status })}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: status === activeStatus ? 700 : 400,
                color: status === activeStatus ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderBottom:
                  status === activeStatus
                    ? '2px solid var(--color-primary)'
                    : '2px solid transparent',
                marginBottom: -2,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '0 16px' }}>
        {isLoading ? (
          <div style={emptySt}>Yükleniyor...</div>
        ) : !data?.items.length ? (
          <div style={emptySt}>Bu kategoride masraf bulunamadı.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.items.map((exp) => (
              <ExpenseCard
                key={exp.id}
                expense={exp}
                onSubmit={() => setSubmitTarget(exp)}
                onEdit={(id) => navigate(`/expenses/new?edit=${id}`)}
                onDelete={handleDelete}
                onDetail={(id) => setDetailId(id)}
                isSubmitting={submitMut.isPending && submitTarget?.id === exp.id}
                isDeleting={deleteMut.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating create button */}
      <button
        onClick={() => navigate('/expenses/new')}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--color-primary)',
          color: '#fff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 100,
        }}
        title="Yeni Masraf"
      >
        <Plus size={22} />
      </button>

      {/* Submit confirmation dialog */}
      {submitTarget && (
        <ExpenseSubmitDialog
          expenseTitle={submitTarget.title}
          onConfirm={handleConfirmSubmit}
          onClose={() => setSubmitTarget(null)}
        />
      )}

      {/* Detail bottom sheet */}
      {detailId && <ExpenseDetailSheet expenseId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

const emptySt: React.CSSProperties = {
  textAlign: 'center',
  color: 'var(--color-text-muted)',
  padding: '48px 0',
  fontSize: 14,
};
