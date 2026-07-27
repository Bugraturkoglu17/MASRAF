import {
  CheckCircle2,
  Clock3,
  Eye,
  FileImage,
  Mail,
  Paperclip,
  ReceiptText,
  RotateCcw,
  Send,
  Trash2,
  UserRound,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { DueDateBadge } from '@/components/ui/DueDateBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { apiFetch } from '@/lib/api-client';
import { formatTry } from '@/lib/money';

export type ExpenseStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type DueUrgency = 'overdue' | 'today' | 'soon' | 'upcoming';
export interface ExpenseAttachmentSummary {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}
export interface ExpenseListItem {
  id: string;
  expenseNumber?: string | null;
  expenseCode?: string | null;
  title: string;
  description?: string | null;
  amount: string;
  currency?: string;
  expenseDate: string;
  dueDate?: string | null;
  dueDaysRemaining?: number | null;
  dueUrgency?: DueUrgency | null;
  status: ExpenseStatus;
  category: { name: string };
  attachments?: ExpenseAttachmentSummary[];
}

const money = formatTry;
const date = (value: string) => new Date(value).toLocaleDateString('tr-TR');

function ReceiptThumbnail({ attachment }: { attachment?: ExpenseAttachmentSummary }) {
  const [preview, setPreview] = useState<{ attachmentId: string; url: string }>();
  const isImage = attachment?.mimeType.startsWith('image/') ?? false;
  const previewUrl = preview && preview.attachmentId === attachment?.id ? preview.url : undefined;

  useEffect(() => {
    let active = true;
    if (!attachment || !isImage) {
      return () => {
        active = false;
      };
    }

    void apiFetch<{ url: string }>(`/attachments/${attachment.id}/download-url`)
      .then(({ url }) => {
        if (active) setPreview({ attachmentId: attachment.id, url });
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [attachment, isImage]);

  return (
    <div className={`receipt-thumbnail${previewUrl ? ' has-image' : ''}`}>
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={`Ek 1: ${attachment?.fileName ?? 'fatura'} önizlemesi`}
          loading="lazy"
        />
      ) : isImage ? (
        <FileImage />
      ) : (
        <ReceiptText />
      )}
    </div>
  );
}

export function MobileReceiptExpenseCard({
  expense,
  onDetail,
  onSubmit,
  onEdit,
  onDelete,
  busy,
}: {
  expense: ExpenseListItem;
  onDetail?: () => void;
  onSubmit?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  busy?: boolean;
}) {
  const first = expense.attachments?.[0];
  return (
    <article className="receipt-expense-card" onClick={onDetail}>
      <ReceiptThumbnail attachment={first} />
      <div className="receipt-body">
        <time>{date(expense.expenseDate)}</time>
        <strong>{expense.category.name}</strong>
        <span title={expense.title}>{expense.title}</span>
        <div className="receipt-badges">
          <StatusBadge status={expense.status} />
          {expense.expenseCode && (
            <span className="expense-code-badge">#{expense.expenseCode}</span>
          )}
        </div>
      </div>
      <div className="receipt-separator" aria-hidden="true" />
      <div className="receipt-aside">
        <strong>{money(expense.amount)}</strong>
        <DueDateBadge
          dueDate={expense.dueDate}
          dueDaysRemaining={expense.dueDaysRemaining}
          dueUrgency={expense.dueUrgency}
          showMissing
        />
      </div>
      {(onSubmit || onEdit || onDelete || onDetail) && (
        <div className="receipt-actions" onClick={(e) => e.stopPropagation()}>
          {onSubmit && (
            <button type="button" disabled={busy} onClick={onSubmit}>
              <Send /> Onaya gönder
            </button>
          )}
          {onEdit && (
            <button type="button" onClick={onEdit}>
              <RotateCcw /> Düzenle
            </button>
          )}
          {onDelete && (
            <button type="button" disabled={busy} onClick={onDelete}>
              <Trash2 /> Sil
            </button>
          )}
          {onDetail && (
            <button type="button" onClick={onDetail}>
              <Eye /> Detay
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export function ExpenseEmptyState({ status }: { status: ExpenseStatus }) {
  const content: Record<ExpenseStatus, [string, string]> = {
    DRAFT: [
      'Henüz taslak masrafınız yok.',
      'Ortadaki + düğmesiyle hızlıca yeni bir masraf oluşturabilirsiniz.',
    ],
    PENDING: ['Onay bekleyen masrafınız bulunmuyor.', 'Gönderdiğiniz masraflar burada görünür.'],
    APPROVED: [
      'Onaylanan masrafınız bulunmuyor.',
      'Yönetici tarafından onaylanan masraflar burada görünür.',
    ],
    REJECTED: [
      'Reddedilen masrafınız bulunmuyor.',
      'Red gerekçesini masraf detayından inceleyebilirsiniz.',
    ],
    CANCELLED: ['İptal edilen masrafınız bulunmuyor.', 'İptal edilen kayıtlar burada görünür.'],
  };
  const Icon =
    status === 'APPROVED'
      ? CheckCircle2
      : status === 'REJECTED'
        ? XCircle
        : status === 'PENDING'
          ? Clock3
          : ReceiptText;
  return (
    <div className="expense-empty-state">
      <span>
        <Icon />
      </span>
      <strong>{content[status][0]}</strong>
      <p>{content[status][1]}</p>
    </div>
  );
}

export function UserApprovalTabs({
  active,
  counts,
  onChange,
}: {
  active: 'PENDING' | 'APPROVED' | 'REJECTED';
  counts?: Partial<Record<'PENDING' | 'APPROVED' | 'REJECTED', number>>;
  onChange: (status: 'PENDING' | 'APPROVED' | 'REJECTED') => void;
}) {
  const labels = { PENDING: 'Bekleyen', APPROVED: 'Onaylanan', REJECTED: 'Reddedilen' } as const;
  return (
    <div className="approval-tabs" role="tablist">
      {(Object.keys(labels) as Array<keyof typeof labels>).map((status) => (
        <button
          type="button"
          role="tab"
          aria-selected={active === status}
          className={active === status ? 'active' : ''}
          key={status}
          onClick={() => onChange(status)}
        >
          {labels[status]}
          {typeof counts?.[status] === 'number' && <small>{counts[status]}</small>}
        </button>
      ))}
    </div>
  );
}

export function UserPendingExpenseList(props: ExpenseListProps) {
  return <ExpenseList {...props} status="PENDING" />;
}
export function UserApprovedExpenseList(props: ExpenseListProps) {
  return <ExpenseList {...props} status="APPROVED" />;
}
export function UserRejectedExpenseList(props: ExpenseListProps) {
  return <ExpenseList {...props} status="REJECTED" />;
}
interface ExpenseListProps {
  items: ExpenseListItem[];
  onDetail: (id: string) => void;
}
function ExpenseList({ items, status, onDetail }: ExpenseListProps & { status: ExpenseStatus }) {
  if (!items.length) return <ExpenseEmptyState status={status} />;
  return (
    <div className="receipt-list">
      {items.map((item) => (
        <MobileReceiptExpenseCard key={item.id} expense={item} onDetail={() => onDetail(item.id)} />
      ))}
    </div>
  );
}

export interface ManagerExpense extends ExpenseListItem {
  user: { id: string; firstName: string; lastName: string; email: string };
}
export function ExpenseSenderInfo({ sender }: { sender: ManagerExpense['user'] }) {
  return (
    <div className="expense-sender">
      <span>
        <UserRound />
      </span>
      <div>
        <strong>
          {sender.firstName} {sender.lastName}
        </strong>
        <small>
          <Mail /> {sender.email}
        </small>
      </div>
    </div>
  );
}
export function ManagerExpenseCard({
  expense,
  selected,
  onSelect,
  onApprove,
  onReject,
  onCancel,
  busy,
}: {
  expense: ManagerExpense;
  selected?: boolean;
  onSelect: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  busy?: boolean;
}) {
  const initials =
    `${expense.user.firstName[0] ?? ''}${expense.user.lastName[0] ?? ''}`.toUpperCase();
  const attachmentCount = expense.attachments?.length ?? 0;

  return (
    <article className={`manager-expense-card ${selected ? 'selected' : ''}`}>
      <button type="button" className="manager-expense-main" onClick={onSelect}>
        {/* Header row: avatar + person + code + attachment */}
        <div className="mec-header">
          <div className="mec-avatar">{initials}</div>
          <div className="mec-person-info">
            <span className="mec-name">
              {expense.user.firstName} {expense.user.lastName}
            </span>
            <span className="mec-email">{expense.user.email}</span>
          </div>
          <div className="mec-badges">
            {attachmentCount > 0 && (
              <span className="mec-attach-badge">
                <Paperclip size={11} />
                {attachmentCount}
              </span>
            )}
            {expense.expenseCode && (
              <span className="expense-code-badge">#{expense.expenseCode}</span>
            )}
          </div>
        </div>

        {/* Category + date + description */}
        <div className="mec-body">
          <div className="mec-catdate">
            <span>{expense.category.name}</span>
            <span className="mec-dot">·</span>
            <span>{date(expense.expenseDate)}</span>
          </div>
          {expense.description && <p className="mec-desc">{expense.description}</p>}
        </div>

        {/* Amount + due badge row */}
        <div className="mec-footer">
          <strong className="mec-amount">{money(expense.amount)}</strong>
          <DueDateBadge
            dueDate={expense.dueDate}
            dueDaysRemaining={expense.dueDaysRemaining}
            dueUrgency={expense.dueUrgency}
            showMissing
          />
        </div>
      </button>

      <div className="manager-card-actions">
        {onApprove && (
          <button type="button" disabled={busy} onClick={onApprove} className="approve">
            <CheckCircle2 /> Onayla
          </button>
        )}
        {onReject && (
          <button type="button" disabled={busy} onClick={onReject} className="reject">
            <XCircle /> Reddet
          </button>
        )}
        <button type="button" onClick={onSelect} className="detail">
          <Eye size={14} /> Detay
        </button>
        {onCancel && (
          <button type="button" disabled={busy} onClick={onCancel} className="cancel">
            İptal
          </button>
        )}
      </div>
    </article>
  );
}
