import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Eye, Send, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useToast } from '@/components/feedback/toast-context';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { apiFetch } from '@/lib/api-client';

type Status = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface Expense {
  id: string;
  expenseNumber: string;
  title: string;
  amount: string;
  currency: string;
  expenseDate: string;
  dueDate?: string;
  status: Status;
  category: { name: string };
}

interface PagedResult {
  items: Expense[];
  meta: { totalItems: number; page: number; totalPages: number };
}

const tabs: { status: Status; label: string }[] = [
  { status: 'DRAFT', label: 'Taslaklar' },
  { status: 'PENDING', label: 'Onayda Bekleyen' },
  { status: 'APPROVED', label: 'Onaylananlar' },
  { status: 'REJECTED', label: 'Reddedilenler' },
];

export function UserExpensesPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const activeStatus = (params.get('status') as Status) ?? 'DRAFT';
  const navigate = useNavigate();
  const { showToast } = useToast();
  const qc = useQueryClient();

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
    },
    onError: () => showToast('Gönderilemedi.', 'error'),
  });

  const fmt = (n: string) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(n));

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Masraflarım</h1>

      {/* Tabs */}
      <div style={tabsStyle}>
        {tabs.map(({ status, label }) => (
          <button
            key={status}
            onClick={() => setParams({ status })}
            style={tabStyle(status === activeStatus)}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={emptyStyle}>Yükleniyor...</div>
      ) : !data?.items.length ? (
        <div style={emptyStyle}>Bu kategoride masraf bulunamadı.</div>
      ) : (
        <div style={listStyle}>
          {data.items.map((exp) => (
            <div key={exp.id} style={cardStyle}>
              <div style={cardTopStyle}>
                <div>
                  <div style={expNumStyle}>{exp.expenseNumber ?? '—'}</div>
                  <div style={expTitleStyle}>{exp.title}</div>
                  <div style={expCategoryStyle}>{exp.category.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={amountStyle}>{fmt(exp.amount)}</div>
                  <div style={dateStyle}>
                    {new Date(exp.expenseDate).toLocaleDateString('tr-TR')}
                  </div>
                  {exp.dueDate && (
                    <div style={{ fontSize: 11, color: 'var(--color-pending)', marginTop: 2 }}>
                      Vade: {new Date(exp.dueDate).toLocaleDateString('tr-TR')}
                    </div>
                  )}
                </div>
              </div>

              <div style={cardBottomStyle}>
                <StatusBadge status={exp.status} />
                <div style={actionsStyle}>
                  {exp.status === 'DRAFT' && (
                    <>
                      <button
                        onClick={() => submitMut.mutate(exp.id)}
                        disabled={submitMut.isPending}
                        style={btnStyle('#16a34a', '#f0fdf4')}
                        title="Onaya Gönder"
                      >
                        <Send size={14} /> Onaya Gönder
                      </button>
                      <button
                        onClick={() => navigate(`/expenses/new?edit=${exp.id}`)}
                        style={btnStyle('var(--color-primary)', '#eff6ff')}
                        title="Düzenle"
                      >
                        <Edit2 size={14} /> Düzenle
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Bu masrafı silmek istediğinize emin misiniz?')) {
                            deleteMut.mutate(exp.id);
                          }
                        }}
                        style={btnStyle('var(--color-danger)', 'var(--color-danger-bg)')}
                        title="Sil"
                      >
                        <Trash2 size={14} /> Sil
                      </button>
                    </>
                  )}
                  {exp.status !== 'DRAFT' && (
                    <button
                      onClick={() => navigate(`/expenses/${exp.id}`)}
                      style={btnStyle('var(--color-text-muted)', 'var(--color-bg)')}
                    >
                      <Eye size={14} /> Detay
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = { padding: '28px 32px', maxWidth: 900 };
const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: 'var(--color-text)',
  margin: '0 0 20px',
};
const tabsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  borderBottom: '2px solid var(--color-border)',
  marginBottom: 20,
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
  borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
  marginBottom: -2,
});

const listStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  color: 'var(--color-text-muted)',
  padding: '48px 0',
  fontSize: 14,
};

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '16px 20px',
  boxShadow: 'var(--shadow-sm)',
};

const cardTopStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 12,
};
const expNumStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--color-text-muted)',
  fontWeight: 500,
  marginBottom: 2,
};
const expTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--color-text)',
};
const expCategoryStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--color-text-muted)',
  marginTop: 2,
};
const amountStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: 'var(--color-text)',
};
const dateStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--color-text-muted)',
  marginTop: 4,
};

const cardBottomStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 8,
};
const actionsStyle: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' };

const btnStyle = (color: string, bg: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '6px 12px',
  borderRadius: 6,
  border: `1px solid ${color}40`,
  background: bg,
  color,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
});
