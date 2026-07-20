import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/components/feedback/toast-context';
import { apiFetch } from '@/lib/api-client';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
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
  dueDate?: string;
  category: { name: string };
  user: User;
}
interface PagedResult {
  items: Expense[];
  meta: { totalItems: number; page: number; totalPages: number };
}

export function ManagerPendingPage(): JSX.Element {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery<PagedResult>({
    queryKey: ['manager-pending'],
    queryFn: () => apiFetch('/expenses/manager/pending?limit=50'),
    refetchInterval: 10000,
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/expenses/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-pending'] });
      qc.invalidateQueries({ queryKey: ['manager-counts'] });
      setSelectedId(null);
      showToast('Masraf onaylandı.', 'success');
    },
    onError: () => showToast('Onaylanamadı.', 'error'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch(`/expenses/${id}/reject`, { method: 'POST', body: { reason } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manager-pending'] });
      qc.invalidateQueries({ queryKey: ['manager-counts'] });
      setRejectModal(null);
      setRejectReason('');
      showToast('Masraf reddedildi.', 'success');
    },
    onError: () => showToast('Reddedilemedi.', 'error'),
  });

  const fmt = (n: string) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(n));

  const selected = data?.items.find((e) => e.id === selectedId);

  return (
    <div style={{ padding: '28px 32px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 20px' }}>
        Onayda Bekleyen Masraflar
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

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Liste */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isLoading ? (
            <div
              style={{ color: 'var(--color-text-muted)', padding: '32px 0', textAlign: 'center' }}
            >
              Yükleniyor...
            </div>
          ) : !data?.items.length ? (
            <div
              style={{ color: 'var(--color-text-muted)', padding: '48px 0', textAlign: 'center' }}
            >
              Bekleyen masraf yok.
            </div>
          ) : (
            data.items.map((exp) => (
              <div
                key={exp.id}
                onClick={() => setSelectedId(exp.id === selectedId ? null : exp.id)}
                style={{
                  background: 'var(--color-surface)',
                  border: `2px solid ${exp.id === selectedId ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  cursor: 'pointer',
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
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
                      {fmt(exp.amount)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {new Date(exp.expenseDate).toLocaleDateString('tr-TR')}
                    </div>
                    {exp.dueDate && (
                      <div style={{ fontSize: 11, color: 'var(--color-pending)', marginTop: 2 }}>
                        Vade: {new Date(exp.dueDate).toLocaleDateString('tr-TR')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detay panel */}
        {selected && (
          <div
            style={{
              width: 320,
              minWidth: 320,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              boxShadow: 'var(--shadow-md)',
              position: 'sticky',
              top: 20,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--color-text)',
                marginBottom: 16,
              }}
            >
              Masraf Detayı
            </div>

            <DetailRow label="Masraf No" value={selected.expenseNumber} />
            <DetailRow label="Başlık" value={selected.title} />
            <DetailRow label="Kategori" value={selected.category.name} />
            <DetailRow label="Tutar" value={fmt(selected.amount)} />
            <DetailRow
              label="Tarih"
              value={new Date(selected.expenseDate).toLocaleDateString('tr-TR')}
            />
            {selected.dueDate && (
              <DetailRow
                label="Vade"
                value={new Date(selected.dueDate).toLocaleDateString('tr-TR')}
              />
            )}
            {selected.description && <DetailRow label="Açıklama" value={selected.description} />}

            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                margin: '16px 0 12px',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                letterSpacing: '0.05em',
              }}
            >
              ÇALIŞAN BİLGİLERİ
            </div>
            <DetailRow
              label="Ad Soyad"
              value={`${selected.user.firstName} ${selected.user.lastName}`}
            />
            <DetailRow label="E-posta" value={selected.user.email} />
            <DetailRow label="Telefon" value={selected.user.phone} />
            <DetailRow label="IBAN" value={selected.user.iban} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
              <button
                onClick={() => {
                  if (window.confirm('Bu masrafı onaylamak istiyor musunuz?')) {
                    approveMut.mutate(selected.id);
                  }
                }}
                disabled={approveMut.isPending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--color-approved)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <CheckCircle size={16} /> Onayla
              </button>
              <button
                onClick={() => setRejectModal(selected.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--color-rejected)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <XCircle size={16} /> Reddet
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Red modal */}
      {rejectModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              padding: 28,
              width: 420,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--color-text)',
                margin: '0 0 8px',
              }}
            >
              Masrafı Reddet
            </h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
              Red açıklaması zorunludur.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Red nedenini açıklayın..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontSize: 14,
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--color-text)',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                İptal
              </button>
              <button
                disabled={!rejectReason.trim() || rejectMut.isPending}
                onClick={() => rejectMut.mutate({ id: rejectModal, reason: rejectReason })}
                style={{
                  padding: '9px 18px',
                  borderRadius: 6,
                  border: 'none',
                  background: !rejectReason.trim()
                    ? 'var(--color-border)'
                    : 'var(--color-rejected)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: !rejectReason.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                Reddet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)', flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          color: 'var(--color-text)',
          fontWeight: 500,
          textAlign: 'right',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </span>
    </div>
  );
}
