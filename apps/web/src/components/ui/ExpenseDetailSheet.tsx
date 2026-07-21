import { useQuery } from '@tanstack/react-query';
import { Download, Paperclip, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { DueDateBadge } from './DueDateBadge';
import { StatusBadge } from './StatusBadge';

import { useToast } from '@/components/feedback/toast-context';
import { apiFetch } from '@/lib/api-client';

interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

interface ExpenseDetail {
  id: string;
  expenseNumber?: string | null;
  title: string;
  description?: string | null;
  amount: string;
  currency: string;
  expenseDate: string;
  dueDate?: string | null;
  status: string;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  category: { name: string };
  attachments: Attachment[];
  approvals?: { approver: { firstName: string; lastName: string } }[];
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    iban?: string | null;
    organization?: { name: string };
    department?: { name: string } | null;
  };
}

interface ExpenseDetailSheetProps {
  expenseId: string;
  onClose: () => void;
}

const fmt = (n: string | number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(n));

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR');
}

export function ExpenseDetailSheet({ expenseId, onClose }: ExpenseDetailSheetProps): JSX.Element {
  const { showToast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { data: expense, isLoading } = useQuery<ExpenseDetail>({
    queryKey: ['expense-detail', expenseId],
    queryFn: () => apiFetch(`/expenses/${expenseId}`),
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const downloadAttachment = async (attachment: Attachment) => {
    if (downloadingId) return;
    setDownloadingId(attachment.id);
    try {
      const { url } = await apiFetch<{ url: string }>(`/attachments/${attachment.id}/download-url`);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Dosya indirilemedi.');
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = attachment.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      showToast('Dosya indirildi.', 'success');
    } catch {
      showToast('Dosya indirilemedi. İnternet bağlantınızı kontrol edin.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 900,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-detail-title"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--color-surface)',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          boxShadow: '0 -4px 40px rgba(0,0,0,0.18)',
          zIndex: 901,
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'slideUp 0.25s ease-out',
        }}
      >
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div
            style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--color-border)' }}
          />
        </div>

        <div style={{ padding: '0 16px 32px' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                #{expense?.expenseNumber ?? '—'}
              </div>
              <h2
                id="expense-detail-title"
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--color-text)',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {isLoading ? 'Yükleniyor...' : expense?.title}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Masraf detayını kapat"
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                marginLeft: 8,
              }}
            >
              <X size={16} color="var(--color-text-muted)" />
            </button>
          </div>

          {expense && (
            <>
              {/* Status + amount */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <StatusBadge
                  status={
                    expense.status as 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
                  }
                />
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>
                  {fmt(expense.amount)}
                </span>
              </div>

              {expense.user && (
                <div className="expense-detail-sender">
                  <h3>Gönderen bilgileri</h3>
                  <DetailRow
                    label="Ad Soyad"
                    value={`${expense.user.firstName} ${expense.user.lastName}`}
                  />
                  <DetailRow label="E-posta" value={expense.user.email} />
                  {expense.user.organization && (
                    <DetailRow label="Şirket" value={expense.user.organization.name} />
                  )}
                  {expense.user.department && (
                    <DetailRow label="Departman" value={expense.user.department.name} />
                  )}
                  {expense.user.phone && <DetailRow label="Telefon" value={expense.user.phone} />}
                  {expense.user.iban && <DetailRow label="IBAN" value={expense.user.iban} />}
                </div>
              )}

              {/* Details grid */}
              <div
                style={{
                  background: 'var(--color-bg)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 14,
                }}
              >
                <DetailRow label="Kategori" value={expense.category.name} />
                <DetailRow label="Masraf Tarihi" value={formatDate(expense.expenseDate)} />
                <DetailRow label="Vade" value={<DueDateBadge dueDate={expense.dueDate} />} />
                {expense.description && <DetailRow label="Açıklama" value={expense.description} />}
                {expense.submittedAt && (
                  <DetailRow label="Gönderilme" value={formatDate(expense.submittedAt)} />
                )}
                {expense.decidedAt && (
                  <DetailRow label="Karar Tarihi" value={formatDate(expense.decidedAt)} />
                )}
                {expense.approvals && expense.approvals.length > 0 && expense.approvals[0] && (
                  <DetailRow
                    label="İşlem Yapan"
                    value={`${expense.approvals[0].approver.firstName} ${expense.approvals[0].approver.lastName}`}
                  />
                )}
                <DetailRow label="Oluşturulma" value={formatDate(expense.createdAt)} />
              </div>

              {/* Rejection reason */}
              {expense.status === 'REJECTED' && expense.rejectionReason && (
                <div
                  style={{
                    background: 'var(--color-rejected-bg)',
                    border: '1px solid var(--color-rejected-border)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--color-rejected)',
                      marginBottom: 4,
                      letterSpacing: '0.05em',
                    }}
                  >
                    RED GEREKÇESİ
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--color-text)' }}>
                    {expense.rejectionReason}
                  </div>
                </div>
              )}

              {/* Attachments */}
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    marginBottom: 8,
                    letterSpacing: '0.05em',
                  }}
                >
                  BELGELER ({expense.attachments.length})
                </div>
                {expense.attachments.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '8px 0' }}>
                    Belge eklenmemiş
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {expense.attachments.map((att) => (
                      <div
                        key={att.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          background: 'var(--color-bg)',
                          borderRadius: 8,
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <Paperclip size={15} color="var(--color-text-muted)" />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: 'var(--color-text)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {att.fileName}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                            {(att.sizeBytes / 1024).toFixed(0)} KB
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={`${att.fileName} dosyasını indir`}
                          disabled={downloadingId !== null}
                          onClick={() => void downloadAttachment(att)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          <Download size={14} color="var(--color-primary)" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <span
        style={{ fontSize: 12, color: 'var(--color-text-muted)', flexShrink: 0, marginRight: 8 }}
      >
        {label}
      </span>
      <span
        style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', textAlign: 'right' }}
      >
        {value}
      </span>
    </div>
  );
}
