import { useQuery } from '@tanstack/react-query';
import { Download, Eye, FileText, Receipt, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { DueDateBadge } from './DueDateBadge';
import { IbanCopyButton } from './IbanCopyButton';
import { StatusBadge } from './StatusBadge';

import { useToast } from '@/components/feedback/toast-context';
import { apiFetch } from '@/lib/api-client';
import { formatTry } from '@/lib/money';

interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  kind?: string;
}

interface ExpenseDetail {
  id: string;
  expenseNumber?: string | null;
  expenseCode?: string | null;
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
  paymentStatus?: string | null;
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
    department?: { name: string } | null;
  };
  paymentRecipientType?: string | null;
  recipientFirstName?: string | null;
  recipientLastName?: string | null;
  recipientIban?: string | null;
  recipientCompanyName?: string | null;
  recipientSnapshotCreatedAt?: string | null;
}

interface ExpenseDetailSheetProps {
  expenseId: string;
  onClose: () => void;
}

const fmt = formatTry;

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR');
}

export function ExpenseDetailSheet({ expenseId, onClose }: ExpenseDetailSheetProps): JSX.Element {
  const { showToast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const { data: expense, isLoading } = useQuery<ExpenseDetail>({
    queryKey: ['expense-detail', expenseId],
    queryFn: () => apiFetch(`/expenses/${expenseId}`),
  });
  const { data: paymentReceipts } = useQuery<Attachment[]>({
    queryKey: ['payment-receipts', expenseId],
    queryFn: () => apiFetch(`/expenses/${expenseId}/payment-receipts`),
    enabled: expense?.status === 'APPROVED',
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxUrl) setLightboxUrl(null);
        else onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, lightboxUrl]);

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

  const viewAttachment = async (attachment: Attachment) => {
    if (viewingId) return;
    setViewingId(attachment.id);
    try {
      const { url } = await apiFetch<{ url: string }>(`/attachments/${attachment.id}/download-url`);
      if (attachment.mimeType === 'application/pdf') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setLightboxUrl(url);
      }
    } catch {
      showToast('Önizleme açılamadı. Lütfen tekrar deneyin.', 'error');
    } finally {
      setViewingId(null);
    }
  };

  const expenseReference = expense?.expenseCode ?? expense?.expenseNumber ?? '------';

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
        className="expense-detail-sheet"
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

        <div className="expense-detail-sheet__content">
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
                Masraf #{expenseReference}
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
                minHeight: 32,
                padding: 0,
                boxSizing: 'border-box',
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
                  {expense.user.department && (
                    <DetailRow label="Departman" value={expense.user.department.name} />
                  )}
                  {expense.user.phone && <DetailRow label="Telefon" value={expense.user.phone} />}
                  {expense.user.iban && (
                    <DetailRow
                      label="IBAN"
                      value={
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {expense.user.iban}
                          <IbanCopyButton value={expense.user.iban} />
                        </span>
                      }
                    />
                  )}
                </div>
              )}

              {/* Ödeme Alıcısı */}
              {expense.paymentRecipientType && (
                <div className="expense-detail-sender" style={{ marginTop: 12 }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Ödeme Alıcısı
                    {expense.paymentRecipientType === 'THIRD_PARTY' && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 99,
                          background: 'var(--color-pending-bg)',
                          color: 'var(--color-pending)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        TAŞERON / HARİCİ ALICI
                      </span>
                    )}
                  </h3>
                  {expense.paymentRecipientType === 'SELF' ? (
                    <>
                      <DetailRow label="Alıcı" value="Kullanıcının Kendisi" />
                      {expense.recipientFirstName && expense.recipientLastName && (
                        <DetailRow
                          label="Ad Soyad"
                          value={`${expense.recipientFirstName} ${expense.recipientLastName}`}
                        />
                      )}
                      {expense.recipientIban && (
                        <DetailRow
                          label="IBAN"
                          value={
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              {expense.recipientIban}
                              <IbanCopyButton value={expense.recipientIban} />
                            </span>
                          }
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {expense.recipientFirstName && expense.recipientLastName && (
                        <DetailRow
                          label="Ad Soyad"
                          value={`${expense.recipientFirstName} ${expense.recipientLastName}`}
                        />
                      )}
                      {expense.recipientCompanyName && (
                        <DetailRow label="Firma" value={expense.recipientCompanyName} />
                      )}
                      {expense.recipientIban && (
                        <DetailRow
                          label="IBAN"
                          value={
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              {expense.recipientIban}
                              <IbanCopyButton value={expense.recipientIban} />
                            </span>
                          }
                        />
                      )}
                    </>
                  )}
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
              {(() => {
                const invoices = expense.attachments.filter((a) => !a.kind || a.kind === 'INVOICE');
                return (
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
                      BELGELER ({invoices.length})
                    </div>
                    {invoices.length === 0 ? (
                      <div
                        style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '8px 0' }}
                      >
                        Belge eklenmemiş
                      </div>
                    ) : (
                      <div className="attachment-list">
                        {invoices.map((att, index) => (
                          <article key={att.id} className="attachment-preview">
                            <span className="attachment-thumbnail">
                              <AttachmentThumb id={att.id} mimeType={att.mimeType} />
                            </span>
                            <div className="attachment-meta">
                              <strong>Masraf #{expenseReference}</strong>
                              <small>
                                Belge {index + 1} · {(att.sizeBytes / 1024).toFixed(0)} KB
                              </small>
                            </div>
                            <button
                              type="button"
                              className="attachment-icon-button"
                              aria-label={`Masraf ${expenseReference}, belge ${index + 1} önizle`}
                              disabled={viewingId !== null || downloadingId !== null}
                              onClick={() => void viewAttachment(att)}
                            >
                              <Eye size={14} color="var(--color-primary)" />
                            </button>
                            <button
                              type="button"
                              className="attachment-icon-button"
                              aria-label={`Masraf ${expenseReference}, belge ${index + 1} indir`}
                              disabled={downloadingId !== null}
                              onClick={() => void downloadAttachment(att)}
                            >
                              <Download size={14} color="var(--color-primary)" />
                            </button>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Payment Receipts */}
              {expense.status === 'APPROVED' && (
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--color-text-muted)',
                      marginBottom: 8,
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Receipt size={12} />
                    ÖDEME DEKONTU {paymentReceipts && `(${paymentReceipts.length})`}
                  </div>
                  {!paymentReceipts || paymentReceipts.length === 0 ? (
                    <div
                      style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '8px 0' }}
                    >
                      Henüz ödeme dekontu eklenmedi.
                    </div>
                  ) : (
                    <div className="attachment-list">
                      {paymentReceipts.map((att, index) => (
                        <article key={att.id} className="attachment-preview">
                          <span className="attachment-thumbnail">
                            <AttachmentThumb id={att.id} mimeType={att.mimeType} />
                          </span>
                          <div className="attachment-meta">
                            <strong>Dekont {index + 1}</strong>
                            <small>{(att.sizeBytes / 1024).toFixed(0)} KB</small>
                          </div>
                          <button
                            type="button"
                            className="attachment-icon-button"
                            aria-label={`Ödeme dekontu ${index + 1} önizle`}
                            disabled={viewingId !== null || downloadingId !== null}
                            onClick={() => void viewAttachment(att)}
                          >
                            <Eye size={14} color="var(--color-primary)" />
                          </button>
                          <button
                            type="button"
                            className="attachment-icon-button"
                            aria-label={`Ödeme dekontu ${index + 1} indir`}
                            disabled={downloadingId !== null}
                            onClick={() => void downloadAttachment(att)}
                          >
                            <Download size={14} color="var(--color-primary)" />
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {lightboxUrl && (
        <div
          className="img-lightbox-backdrop"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Belge önizleme"
        >
          <button
            type="button"
            className="img-lightbox-close"
            onClick={() => setLightboxUrl(null)}
            aria-label="Önizlemeyi kapat"
          >
            <X size={18} />
          </button>
          <ZoomableImage src={lightboxUrl} alt="Belge önizleme" />
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              fontSize: 11,
              padding: '4px 12px',
              borderRadius: 99,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            İki parmakla yakınlaştır · Çift dokun sıfırla
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

function AttachmentThumb({ id, mimeType }: { id: string; mimeType: string }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    if (!mimeType.startsWith('image/')) return;
    void apiFetch<{ url: string }>(`/attachments/${id}/download-url`)
      .then(({ url }) => setSrc(url))
      .catch(() => undefined);
  }, [id, mimeType]);
  return src ? (
    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <FileText size={20} />
  );
}

function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const s = {
      scale: 1,
      ox: 0,
      oy: 0,
      lastDist: 0,
      lastScale: 1,
      lastOx: 0,
      lastOy: 0,
      startX: 0,
      startY: 0,
      startMidX: 0,
      startMidY: 0,
      pinching: false,
      panning: false,
      lastTap: 0,
    };

    const apply = () => {
      el.style.transform = `scale(${s.scale}) translate(${s.ox / s.scale}px, ${s.oy / s.scale}px)`;
      el.style.cursor = s.scale > 1 ? 'grab' : 'default';
    };

    const t0 = (t: TouchList) => t.item(0)!;
    const t1 = (t: TouchList) => t.item(1)!;
    const dist = (t: TouchList) =>
      Math.hypot(t0(t).clientX - t1(t).clientX, t0(t).clientY - t1(t).clientY);

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        s.pinching = true;
        s.panning = false;
        s.lastDist = dist(e.touches);
        s.lastScale = s.scale;
        s.lastOx = s.ox;
        s.lastOy = s.oy;
        s.startMidX = (t0(e.touches).clientX + t1(e.touches).clientX) / 2;
        s.startMidY = (t0(e.touches).clientY + t1(e.touches).clientY) / 2;
      } else if (e.touches.length === 1) {
        s.pinching = false;
        if (s.scale > 1) {
          s.panning = true;
          s.startX = t0(e.touches).clientX;
          s.startY = t0(e.touches).clientY;
          s.lastOx = s.ox;
          s.lastOy = s.oy;
        } else {
          const now = Date.now();
          if (now - s.lastTap < 300) {
            s.scale = 1;
            s.ox = 0;
            s.oy = 0;
            apply();
          }
          s.lastTap = now;
          s.panning = false;
        }
      }
    };

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && s.pinching) {
        const d = dist(e.touches);
        const midX = (t0(e.touches).clientX + t1(e.touches).clientX) / 2;
        const midY = (t0(e.touches).clientY + t1(e.touches).clientY) / 2;
        s.scale = Math.min(6, Math.max(1, s.lastScale * (d / s.lastDist)));
        s.ox = s.lastOx + (midX - s.startMidX);
        s.oy = s.lastOy + (midY - s.startMidY);
        apply();
      } else if (e.touches.length === 1 && s.panning) {
        s.ox = s.lastOx + (t0(e.touches).clientX - s.startX);
        s.oy = s.lastOy + (t0(e.touches).clientY - s.startY);
        apply();
      }
    };

    const onEnd = () => {
      s.pinching = false;
      s.panning = false;
      if (s.scale < 1.05) {
        s.scale = 1;
        s.ox = 0;
        s.oy = 0;
        apply();
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, []);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      onClick={(e) => e.stopPropagation()}
      style={{
        maxWidth: '92vw',
        maxHeight: '88vh',
        objectFit: 'contain',
        borderRadius: 8,
        touchAction: 'none',
        userSelect: 'none',
        transformOrigin: 'center center',
        willChange: 'transform',
      }}
    />
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
