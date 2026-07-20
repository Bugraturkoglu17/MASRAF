import { useQuery } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  iban: string;
}
interface Expense {
  id: string;
  expenseNumber: string;
  title: string;
  description?: string;
  amount: string;
  currency: string;
  expenseDate: string;
  category: { name: string };
  user: User;
  reviewedAt?: string;
  reviewedBy?: { firstName: string; lastName: string };
}
interface PagedResult {
  items: Expense[];
  meta: { totalItems: number };
}

export function ManagerApprovedPage(): JSX.Element {
  const { data, isLoading } = useQuery<PagedResult>({
    queryKey: ['manager-approved'],
    queryFn: () => apiFetch('/expenses/manager/approved?limit=50'),
    refetchInterval: 30000,
  });

  const fmt = (n: string) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(n));

  return (
    <div style={{ padding: '28px 32px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 20px' }}>
        Onaylanan Masraflar
        {data && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 400,
              color: 'var(--color-text-muted)',
              marginLeft: 8,
            }}
          >
            ({data.meta.totalItems})
          </span>
        )}
      </h1>

      {isLoading ? (
        <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '32px 0' }}>
          Yükleniyor...
        </div>
      ) : !data?.items.length ? (
        <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '48px 0' }}>
          Henüz onaylanan masraf yok.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.items.map((exp) => (
            <div
              key={exp.id}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-approved-border)',
                borderLeft: '4px solid var(--color-approved)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {exp.expenseNumber}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      marginTop: 2,
                    }}
                  >
                    {exp.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {exp.user.firstName} {exp.user.lastName} · {exp.category.name}
                  </div>
                  {exp.user.iban && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      IBAN: {exp.user.iban}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-approved)' }}>
                    {fmt(exp.amount)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {new Date(exp.expenseDate).toLocaleDateString('tr-TR')}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 6,
                      justifyContent: 'flex-end',
                    }}
                  >
                    <CheckCircle size={13} color="var(--color-approved)" />
                    <span style={{ fontSize: 12, color: 'var(--color-approved)', fontWeight: 500 }}>
                      Onaylandı
                    </span>
                  </div>
                  {exp.reviewedAt && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {new Date(exp.reviewedAt).toLocaleDateString('tr-TR')}
                    </div>
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
