import { useQuery } from '@tanstack/react-query';
import { XCircle } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';

interface User {
  firstName: string;
  lastName: string;
  email: string;
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
  rejectionReason?: string;
  reviewedAt?: string;
}
interface PagedResult {
  items: Expense[];
  meta: { totalItems: number };
}

export function ManagerRejectedPage(): JSX.Element {
  const { data, isLoading } = useQuery<PagedResult>({
    queryKey: ['manager-rejected'],
    queryFn: () => apiFetch('/expenses/manager/rejected?limit=50'),
    refetchInterval: 30000,
  });

  const fmt = (n: string) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(n));

  return (
    <div style={{ padding: '28px 32px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 20px' }}>
        Reddedilen Masraflar
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
          Henüz reddedilen masraf yok.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.items.map((exp) => (
            <div
              key={exp.id}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-rejected-border)',
                borderLeft: '4px solid var(--color-rejected)',
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
                <div style={{ flex: 1 }}>
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
                  {exp.rejectionReason && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '8px 12px',
                        background: 'var(--color-rejected-bg)',
                        borderRadius: 6,
                        border: '1px solid var(--color-rejected-border)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--color-rejected)',
                          marginBottom: 2,
                        }}
                      >
                        Red Gerekçesi
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-text)' }}>
                        {exp.rejectionReason}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', marginLeft: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-rejected)' }}>
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
                    <XCircle size={13} color="var(--color-rejected)" />
                    <span style={{ fontSize: 12, color: 'var(--color-rejected)', fontWeight: 500 }}>
                      Reddedildi
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
